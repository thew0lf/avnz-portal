import { Controller, Post, Body, BadRequestException, Get, Req } from '@nestjs/common'
import { pool } from './db.js'
import { verifyPassword } from './auth.util.js'
import { hashPassword, scryptHash, signToken, randomToken, sha256hex } from './auth.util.js'
import { validatePassword } from './security.js'

@Controller('orgs')
export class OrgsController {
  @Get('mine')
  async mine(@Req() req: any) {
    const userId = req?.auth?.userId
    if (!userId) throw new BadRequestException('unauthorized')
    const c = await pool.connect()
    try {
      const r = await c.query(`select o.id, o.code, o.name from organizations o join memberships m on m.org_id=o.id where m.user_id=$1 group by o.id, o.code, o.name order by o.name`, [userId])
      return { rows: r.rows }
    } finally { c.release() }
  }
  @Post('register')
  async register(@Body() body: any) {
    const { org_code, org_name, email, username, password } = body || {}
    if (!org_code || !org_name || !email || !password) throw new BadRequestException('org_code, org_name, email, password required')
    const client = await pool.connect()
    try {
      await client.query('begin')
      // Create org
      const orgIns = await client.query('insert into organizations(code, name) values ($1,$2) returning id, code, name', [String(org_code).toLowerCase(), org_name])
      const org = orgIns.rows[0]
      // Create user
      await validatePassword(client, String(password))
      const pw = await hashPassword(String(password))
      // Note: users.org_id is a legacy TEXT column; set to org.code for compatibility
      const u = await client.query('insert into users(org_id,email,username,password_hash) values ($1,$2,$3,$4) returning id, email, username', [String(org.code), String(email).toLowerCase(), username || null, pw])
      const user = u.rows[0]
      // Create default client/company under this org (code mirrors org.code)
      let clientId: string | null = null
      try {
        const cIns = await client.query('insert into clients(org_id, code, name) values ($1,$2,$3) returning id', [org.id, org.code, org.name])
        clientId = cIns.rows[0]?.id || null
      } catch {
        const cSel = await client.query('select id from clients where org_id=$1 and code=$2', [org.id, org.code])
        clientId = cSel.rows[0]?.id || null
      }

      // Create org-level role 'org' (client_id is null), tolerate duplicates
      let roleId: string | null = null
      const roleIns = await client.query('insert into roles(org_id, client_id, name, description) values ($1,$2,$3,$4) on conflict do nothing returning id', [org.id, null, 'org', 'Organization manager'])
      roleId = roleIns.rows[0]?.id || null
      if (!roleId) {
        const r = await client.query('select id from roles where org_id=$1 and client_id is null and name=$2', [org.id, 'org'])
        roleId = r.rows[0]?.id || null
      }
      if (!roleId) throw new Error('failed to create or find org role')
      const perms = await client.query('select id from permissions')
      for (const p of perms.rows) {
        await client.query('insert into role_permissions(role_id, permission_id) values ($1,$2) on conflict do nothing', [roleId, p.id])
      }
      // Membership at org level
      await client.query('insert into memberships(user_id, org_id, role, role_id) values ($1,$2,$3,$4)', [user.id, org.id, 'org', roleId])
      // Also add client membership for default company
      if (clientId) {
        await client.query('insert into client_members(user_id, client_id, role) values ($1,$2,$3) on conflict do nothing', [user.id, clientId, 'client-admin'])
      }
      await client.query('commit')

      // Build perms list for token
      const permsKeys = await client.query('select key from permissions')
      const permList = permsKeys.rows.map((x: any) => x.key)

      // Issue tokens
      const token = signToken({ userId: String(user.id), email: user.email, orgId: org.code, roles: ['org','portal-manager'], orgUUID: String(org.id), clientCode: String(org.code), perms: permList }, process.env.AUTH_SECRET || 'dev-secret-change-me')
      const refresh = randomToken(32)
      const hash = sha256hex(refresh)
      const exp = new Date(Date.now() + 30 * 24 * 3600 * 1000)
      await client.query('insert into refresh_tokens(user_id, token_hash, expires_at) values ($1,$2,$3)', [user.id, hash, exp.toISOString()])

      return { token, refresh_token: refresh, refresh_expires: exp.toISOString(), user: { id: user.id, email: user.email }, org: { id: org.id, code: org.code, name: org.name } }
    } catch (e: any) {
      try { await client.query('rollback') } catch {}
      if (String(e?.message || '').includes('organizations_code_key')) throw new BadRequestException('org_code already exists')
      if (String(e?.message || '').includes('users_email_key') || String(e?.message||'').includes('idx_users_email')) throw new BadRequestException('email already exists')
      throw e
    } finally {
      client.release()
    }
  }

  @Post('update')
  async update(@Req() req: any, @Body() body: any){
    const userId = req?.auth?.userId
    const orgUUID = req?.auth?.orgUUID
    const roles: string[] = req?.auth?.roles || []
    if (!userId || !orgUUID) throw new BadRequestException('unauthorized')
    if (!roles.includes('org')) throw new BadRequestException('forbidden')
    const { name, code, current_password } = body || {}
    if (!name || String(name).trim().length < 1) throw new BadRequestException('name required')
    const c = await pool.connect(); try {
      // Ensure membership in org
      const m = await c.query('select 1 from memberships where user_id=$1 and org_id=$2', [userId, orgUUID])
      if (!m.rows[0]) throw new BadRequestException('unauthorized')
      // Load current org record
      const cur = await c.query('select id, code, name from organizations where id=$1', [orgUUID])
      const before = cur.rows[0] || null
      // If code provided, validate and ensure unique
      let newCode: string | null = null
      if (code !== undefined) {
        const candidate = String(code).toLowerCase()
        if (!/^[a-z0-9-]{3,32}$/.test(candidate)) throw new BadRequestException('invalid code')
        // Verify current password before sensitive change
        const pw = await c.query('select password_hash from users where id=$1', [userId])
        const row = pw.rows[0]
        if (!row || !current_password || !await verifyPassword(String(current_password), String(row.password_hash))) throw new BadRequestException('invalid password')
        // Unique across organizations
        const exists = await c.query('select 1 from organizations where lower(code)=lower($1) and id<>$2 limit 1', [candidate, orgUUID])
        if (exists.rows[0]) throw new BadRequestException('code already exists')
        newCode = candidate
      }
      // Update org fields
      if (newCode) {
        await c.query('update organizations set name=$1, code=$2 where id=$3', [String(name), newCode, orgUUID])
        // Best-effort: update legacy users.org_id text to reflect new code
        try { await c.query('update users set org_id=$1 where org_id=$2', [newCode, before?.code || newCode]) } catch {}
      } else {
        await c.query('update organizations set name=$1 where id=$2', [String(name), orgUUID])
      }
      // Audit
      const after = { name, code: newCode || before?.code }
      try { await c.query('insert into audit_log(org_id, user_id, action, entity, entity_id, before, after) values ($1,$2,$3,$4,$5,$6,$7)', [orgUUID, userId, 'update', 'organization', String(orgUUID), JSON.stringify(before), JSON.stringify(after)]) } catch {}
      return { ok: true }
    } finally { c.release() }
  }

  @Get('audit')
  async audit(@Req() req:any){
    const userId = req?.auth?.userId
    const orgUUID = req?.auth?.orgUUID
    const roles: string[] = req?.auth?.roles || []
    if (!userId || !orgUUID) throw new BadRequestException('unauthorized')
    if (!roles.includes('org')) throw new BadRequestException('forbidden')
    const c = await pool.connect(); try {
      const q: any = req.query || {}
      const lim = Math.max(1, Math.min(200, Number(q.limit || '50')))
      const off = Math.max(0, Number(q.offset || '0'))
      const cond: string[] = ['a.org_id = $1']
      const args: any[] = [orgUUID]
      if (q.action) { args.push(String(q.action).toLowerCase()); cond.push(`lower(a.action)= $${args.length}`) }
      if (q.entity) { args.push(String(q.entity).toLowerCase()); cond.push(`lower(a.entity)= $${args.length}`) }
      if (q.from) { args.push(new Date(String(q.from)).toISOString()); cond.push(`a.created_at >= $${args.length}`) }
      if (q.to) { args.push(new Date(String(q.to)).toISOString()); cond.push(`a.created_at <= $${args.length}`) }
      args.push(lim); args.push(off)
      const sql = `select a.created_at, a.user_id, u.email as user_email, a.action, a.entity, a.entity_id, a.before, a.after
                     from audit_log a
                     left join users u on u.id::text = a.user_id
                    where ${cond.join(' and ')}
                    order by a.created_at desc
                    limit $${args.length-1} offset $${args.length}`
      const r = await c.query(sql, args)
      return { rows: r.rows, limit: lim, offset: off }
    } finally { c.release() }
  }
}
