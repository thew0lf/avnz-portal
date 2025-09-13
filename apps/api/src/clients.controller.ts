import { Controller, Post, Body, BadRequestException, Get, Req, ForbiddenException } from '@nestjs/common'
import { pool, getClientForReq } from './db.js'
import type { Request } from 'express'
import { scryptHash, randomToken, sha256hex } from './auth.util.js'
import { sendInviteEmail } from './mailer.js'
import { audit } from './audit.js'

function genCode(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < length; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return s
}

@Controller('clients')
export class ClientsController {
  @Get()
  async list(@Req() req: Request & { auth?: any }) {
    const org = req.auth?.orgUUID
    if (!org) throw new BadRequestException('org required')
    const perms: string[] = req.auth?.perms || []
    if (!perms.includes('manage_clients') && !perms.includes('admin')) throw new ForbiddenException('manage_clients required')
    const client = await getClientForReq(req as any)
    try {
      const url = new URL(req.url, 'http://local')
      const q = url.searchParams.get('q') || ''
      const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')||'20')))
      const offset = Math.max(0, Number(url.searchParams.get('offset')||'0'))
      let sql = 'select c.id, c.code, c.name, c.created_at, u.email as manager_email from clients c left join users u on u.id=c.manager_user_id where c.org_id=$1'
      const args: any[] = [org]
      if (q) { args.push(`%${q.toLowerCase()}%`); sql += ` and (lower(c.code) like $${args.length} or lower(c.name) like $${args.length})` }
      sql += ' order by c.created_at desc'
      sql += ` limit ${limit} offset ${offset}`
      const { rows } = await client.query(sql, args)
      return { rows, limit, offset, q }
    } finally {
      client.release()
    }
  }

  @Post('register')
  async register(@Req() req: Request & { auth?: any }, @Body() body: any) {
    const org = req.auth?.orgUUID
    if (!org) throw new BadRequestException('org required')
    const perms: string[] = req.auth?.perms || []
    if (!perms.includes('manage_clients') && !perms.includes('admin')) throw new ForbiddenException('manage_clients required')
    const { name } = body || {}
    if (!name) throw new BadRequestException('name required')
    const client = await getClientForReq(req as any)
    try {
      // Try to insert with an auto-generated unique code, retry on collision
      let created: any = null
      for (let i = 0; i < 10; i++) {
        const c = genCode().toLowerCase()
        try {
          const { rows } = await client.query(
            'insert into clients(org_id, code, name, manager_user_id) values ($1,$2,$3,$4) returning id, code, name, created_at',
            [org, c, name, req.auth?.userId || null]
          )
          created = rows[0]
          break
        } catch (e: any) {
          if (String(e?.message || '').toLowerCase().includes('duplicate')) continue
          throw e
        }
      }
      if (!created) throw new BadRequestException('failed to generate unique client code')
      // Seed default client roles
      try {
        const roleAdmin = await client.query(
          'insert into roles(org_id, client_id, name, description) values ($1,$2,$3,$4) on conflict do nothing returning id',
          [org, created.id, 'client-admin', 'Client administrator']
        )
        const roleUser = await client.query(
          'insert into roles(org_id, client_id, name, description) values ($1,$2,$3,$4) on conflict do nothing returning id',
          [org, created.id, 'client-user', 'Client user']
        )
        const pAdminKeys = ['manage_projects','manage_members','view_usage','ingest','search']
        const pUserKeys = ['ingest','search']
        const pAdmin = await client.query('select id, key from permissions where key = any($1)', [pAdminKeys])
        const pUser = await client.query('select id, key from permissions where key = any($1)', [pUserKeys])
        const adminRoleId = roleAdmin.rows[0]?.id
        const userRoleId = roleUser.rows[0]?.id
        if (adminRoleId) for (const r of pAdmin.rows) await client.query('insert into role_permissions(role_id, permission_id) values ($1,$2) on conflict do nothing', [adminRoleId, r.id])
        if (userRoleId) for (const r of pUser.rows) await client.query('insert into role_permissions(role_id, permission_id) values ($1,$2) on conflict do nothing', [userRoleId, r.id])
      } catch {}
      await audit(req as any, 'create', 'client', created.id, null, created)
      return created
    } catch (e: any) {
      if (String(e?.message || '').includes('duplicate')) throw new BadRequestException('code already exists')
      throw e
    } finally {
      client.release()
    }
  }

  // Public: allow a new client company to self-register under an existing org (by org_code)
  @Post('self-register')
  async selfRegister(@Body() body: any) {
    const { org_code, client_name, email, username, password } = body || {}
    if (!org_code || !client_name || !email || !password) throw new BadRequestException('org_code, client_name, email, password required')
    const client = await pool.connect()
    try {
      await client.query('begin')
      // find org by code
      const o = await client.query('select id, code from organizations where code=$1', [String(org_code).toLowerCase()])
      const org = o.rows[0]
      if (!org) throw new BadRequestException('invalid org_code')
      // create client with auto-generated unique code (retry on collision)
      let cl: any = null
      for (let i = 0; i < 10; i++) {
        const c = genCode().toLowerCase()
        try {
          const cIns = await client.query('insert into clients(org_id, code, name) values ($1,$2,$3) returning id, code, name, created_at', [org.id, c, client_name])
          cl = cIns.rows[0]
          break
        } catch (e: any) {
          if (String(e?.message || '').toLowerCase().includes('duplicate')) continue
          throw e
        }
      }
      if (!cl) throw new BadRequestException('failed to generate unique client code')
      // Seed default client roles
      try {
        const roleAdmin = await client.query(
          'insert into roles(org_id, client_id, name, description) values ($1,$2,$3,$4) on conflict do nothing returning id',
          [org.id, cl.id, 'client-admin', 'Client administrator']
        )
        const roleUser = await client.query(
          'insert into roles(org_id, client_id, name, description) values ($1,$2,$3,$4) on conflict do nothing returning id',
          [org.id, cl.id, 'client-user', 'Client user']
        )
        const pAdminKeys = ['manage_projects','manage_members','view_usage','ingest','search']
        const pUserKeys = ['ingest','search']
        const pAdmin = await client.query('select id, key from permissions where key = any($1)', [pAdminKeys])
        const pUser = await client.query('select id, key from permissions where key = any($1)', [pUserKeys])
        const adminRoleId = roleAdmin.rows[0]?.id
        const userRoleId = roleUser.rows[0]?.id
        if (adminRoleId) for (const r of pAdmin.rows) await client.query('insert into role_permissions(role_id, permission_id) values ($1,$2) on conflict do nothing', [adminRoleId, r.id])
        if (userRoleId) for (const r of pUser.rows) await client.query('insert into role_permissions(role_id, permission_id) values ($1,$2) on conflict do nothing', [userRoleId, r.id])
      } catch {}
      // create primary user for this client
      const pw = scryptHash(String(password))
      const uIns = await client.query('insert into users(org_id,email,username,password_hash) values ($1,$2,$3,$4) returning id, email, username', [cl.code, String(email).toLowerCase(), username || null, pw])
      const user = uIns.rows[0]
      // org membership with role "client"
      // Attach client-admin role to the first user
      let adminRoleId: string | null = null
      try {
        const r = await client.query('select id from roles where org_id=$1 and client_id=$2 and name=$3', [org.id, cl.id, 'client-admin'])
        adminRoleId = r.rows[0]?.id || null
      } catch {}
      await client.query('insert into memberships(user_id, org_id, role, role_id) values ($1,$2,$3,$4) on conflict do nothing', [user.id, org.id, 'client-admin', adminRoleId])
      // client membership
      await client.query('insert into client_members(user_id, client_id, role) values ($1,$2,$3) on conflict do nothing', [user.id, cl.id, 'client'])
      await client.query('commit')
      return { client: { id: cl.id, code: cl.code, name: cl.name }, user: { id: user.id, email: user.email, username: user.username }, org: { id: org.id, code: org.code } }
    } catch (e: any) {
      try { await client.query('rollback') } catch {}
      if (String(e?.message || '').includes('duplicate') || String(e?.message || '').includes('clients_code_key')) throw new BadRequestException('client_code already exists')
      if (String(e?.message || '').includes('users_email_key') || String(e?.message||'').includes('idx_users_email')) throw new BadRequestException('email already exists')
      throw e
    } finally {
      client.release()
    }
  }

  // Invite a user to a client without exposing client code (org admins or client managers)
  @Post('invite')
  async invite(@Req() req: Request & { auth?: any }, @Body() body: any) {
    const org = req.auth?.orgUUID
    if (!org) throw new BadRequestException('org required')
    const perms: string[] = req.auth?.perms || []
    const requesterClientId: string | null = req.auth?.clientId || null
    const { email, client_id, role = 'user', role_id } = body || {}
    if (!email) throw new BadRequestException('email required')
    const client = await pool.connect()
    try {
      // resolve target client
      let cid: string | null = null
      if (!perms.includes('admin') && !perms.includes('manage_members')) {
        // client-scoped user: can only invite to their own client
        cid = requesterClientId
      } else {
        cid = client_id || requesterClientId || null
      }
      if (!cid) throw new BadRequestException('client_id required')
      // validate client belongs to org
      const c = await client.query('select id, code from clients where id=$1 and org_id=$2', [cid, org])
      const cl = c.rows[0]
      if (!cl) throw new BadRequestException('invalid client_id')
      // optional role_id must belong to org (and optionally match client scope)
      let rid: string | null = null
      if (role_id) {
        const r = await client.query('select id, client_id from roles where id=$1 and org_id=$2', [role_id, org])
        const rr = r.rows[0]
        if (!rr) throw new BadRequestException('invalid role_id')
        if (rr.client_id && String(rr.client_id) !== String(cid)) throw new BadRequestException('role_id not in client')
        rid = rr.id
      }
      const token = randomToken(32)
      const hash = sha256hex(token)
      const exp = new Date(Date.now() + 7 * 24 * 3600 * 1000)
      await client.query(
        'insert into client_invites(org_id, client_id, email, role, role_id, token_hash, expires_at) values ($1,$2,$3,$4,$5,$6,$7)',
        [org, cid, String(email).toLowerCase(), role, rid, hash, exp.toISOString()]
      )
      try { await sendInviteEmail(String(email).toLowerCase(), token, { clientName: cl.name }) } catch (e) { console.warn('sendInviteEmail failed', e) }
      return { ok: true, invite_token: token, expires: exp.toISOString(), client: { id: cl.id, code: cl.code } }
    } finally { client.release() }
  }

  // Client user convenience: get my client details
  @Get('me')
  async me(@Req() req: Request & { auth?: any }) {
    const org = req.auth?.orgUUID
    const clientId = req.auth?.clientId
    if (!org || !clientId) throw new BadRequestException('not a client user')
    const client = await pool.connect()
    try {
      const r = await client.query('select id, code, name, created_at from clients where id=$1 and org_id=$2', [clientId, org])
      const row = r.rows[0]
      if (!row) throw new BadRequestException('client not found')
      return row
    } finally { client.release() }
  }

  // List invites (org-wide for admins/managers; otherwise, only the current client)
  @Get('invites')
  async listInvites(@Req() req: Request & { auth?: any }) {
    const org = req.auth?.orgUUID
    if (!org) throw new BadRequestException('org required')
    const perms: string[] = req.auth?.perms || []
    const requesterClientId: string | null = req.auth?.clientId || null
    const client = await pool.connect()
    try {
      if (!perms.includes('admin') && !perms.includes('manage_members')) {
        if (!requesterClientId) throw new ForbiddenException('not allowed')
        const { rows } = await client.query(
          `select ci.id, ci.email, ci.role, ci.role_id, ci.expires_at, ci.used_at, ci.revoked, ci.created_at
           from client_invites ci where ci.org_id=$1 and ci.client_id=$2
           order by ci.created_at desc`,
          [org, requesterClientId]
        )
        return { rows }
      }
      const { rows } = await client.query(
        `select ci.id, ci.email, ci.role, ci.role_id, ci.expires_at, ci.used_at, ci.revoked, ci.created_at, ci.client_id
         from client_invites ci where ci.org_id=$1
         order by ci.created_at desc`,
        [org]
      )
      return { rows }
    } finally { client.release() }
  }

  // Revoke an invite (admin/manager or client manager for their client)
  @Post('invites/:id/revoke')
  async revokeInvite(@Req() req: Request & { auth?: any }) {
    const org = req.auth?.orgUUID
    if (!org) throw new BadRequestException('org required')
    const perms: string[] = req.auth?.perms || []
    const requesterClientId: string | null = req.auth?.clientId || null
    const id = (req.params as any).id
    const client = await pool.connect()
    try {
      const r = await client.query('select id, client_id from client_invites where id=$1 and org_id=$2', [id, org])
      const inv = r.rows[0]
      if (!inv) throw new BadRequestException('invite not found')
      if (!perms.includes('admin') && !perms.includes('manage_members')) {
        if (!requesterClientId || String(requesterClientId) !== String(inv.client_id)) throw new ForbiddenException('not allowed')
      }
      await client.query('update client_invites set revoked=true where id=$1', [id])
      return { ok: true }
    } finally { client.release() }
  }

  @Post(':id/manager')
  async setManager(@Req() req: Request & { auth?: any }, @Body() body: any) {
    const org = req.auth?.orgUUID
    if (!org) throw new BadRequestException('org required')
    const perms: string[] = req.auth?.perms || []
    if (!perms.includes('manage_clients') && !perms.includes('admin')) throw new BadRequestException('manage_clients required')
    const id = (req.params as any).id
    const { identifier } = body || {}
    if (!identifier) throw new BadRequestException('identifier required')
    const client = await pool.connect()
    try {
      // validate client in org
      const c = await client.query('select id from clients where id=$1 and org_id=$2', [id, org])
      if (!c.rows[0]) throw new BadRequestException('client not found')
      const ident = String(identifier).toLowerCase()
      const u = await client.query('select id from users where lower(email)=$1 or lower(username)=lower($2)', [ident, identifier])
      const user = u.rows[0]
      if (!user) throw new BadRequestException('user not found')
      await client.query('update clients set manager_user_id=$1 where id=$2', [user.id, id])
      await audit(req as any, 'update', 'client.manager', id, null, { manager_user_id: user.id })
      return { ok: true }
    } finally { client.release() }
  }
}
