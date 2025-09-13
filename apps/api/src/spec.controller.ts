import { Controller, Post, Get, Param, Body, Req, BadRequestException } from '@nestjs/common'
import type { Request } from 'express'
import { pool } from './db.js'
import { scryptHash, hashPassword } from './auth.util.js'
import { audit } from './audit.js'
import { validatePassword } from './security.js'
import { sendInviteEmail } from './mailer.js'
import { sendInviteSms } from './sms.js'

function genShort(len=6){ const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<len;i++) s+=a[Math.floor(Math.random()*a.length)]; return s }

@Controller('api')
export class SpecController {
  // First-run bootstrap: create first org + owner
  @Post('bootstrap/org')
  async bootstrapOrg(@Body() body:any, req?: any) {
    const { org_name, admin_email, password } = body||{}
    if (!org_name || !admin_email || !password) throw new BadRequestException('org_name, admin_email, password required')
    const c = await pool.connect(); try {
      // naive guard: only allow if no org node exists
      const chk = await c.query("select 1 from authz.nodes where type='org' limit 1")
      if (chk.rows[0]) throw new BadRequestException('already initialized')
      await c.query('begin')
      await validatePassword(c, String(password))
      // create org node
      const orgIdRes = await c.query("insert into authz.nodes(id,type,slug,name,parent_id,path) values (gen_random_uuid(),'org','org', $1, null, 'org'::ltree) returning id", [org_name])
      const orgNodeId = orgIdRes.rows[0].id
      // create minimal user in local users table
      const pw = await hashPassword(String(password))
      const uRes = await c.query("insert into users(org_id,email,password_hash) values ($1,$2,$3) returning id,email", ['bootstrap', String(admin_email).toLowerCase(), pw])
      const userId = uRes.rows[0].id
      // lookup OrgOwner role id
      const r = await c.query("select id from authz.roles where name='OrgOwner' limit 1")
      const roleId = r.rows[0]?.id
      if (!roleId) throw new Error('missing OrgOwner role seed')
      await c.query('insert into authz.role_assignments(id,user_id,node_id,role_id) values (gen_random_uuid(),$1,$2,$3) on conflict do nothing', [userId, orgNodeId, roleId])
      await c.query('commit')
      await audit(req as any, 'create','bootstrap.org', orgNodeId, null, { org_name, admin_email })
      return { ok:true, orgNodeId, userId }
    } catch(e){ try{ await c.query('rollback') }catch{} throw e } finally { c.release() }
  }

  // Create client under an org node; server generates short code
  @Post('clients')
  async createClient(@Body() body:any, req?: any) {
    const { orgNodeId, name } = body||{}
    if (!orgNodeId || !name) throw new BadRequestException('orgNodeId, name required')
    const c = await pool.connect(); try {
      // find parent path
      const p = await c.query('select path::text as path from authz.nodes where id=$1 and type=$2',[orgNodeId,'org'])
      const parentPath = p.rows[0]?.path; if (!parentPath) throw new BadRequestException('invalid orgNodeId')
      // generate unique code
      let code: string | null = null
      for (let i=0;i<10;i++){ const candidate=genShort().toLowerCase(); const exists = await c.query('select 1 from clients where code=$1 limit 1',[candidate]); if(!exists.rows[0]){ code=candidate; break } }
      if (!code) throw new BadRequestException('failed to generate short code')
      await c.query('begin')
      // create client node
      const slug = name.toLowerCase().replace(/[^a-z0-9_]+/g,'_').replace(/^_+|_+$/g,'') || 'client'
      const path = `${parentPath}.${slug}`
      const nRes = await c.query("insert into authz.nodes(id,type,slug,name,parent_id,path) values (gen_random_uuid(),'client',$1,$2,$3,$4::ltree) returning id", [slug, name, orgNodeId, path])
      const nodeId = nRes.rows[0].id
      // also create row in legacy clients table for login flow (if exists)
      try { await c.query('insert into clients(org_id, code, name) values ($1,$2,$3)', [orgNodeId, code, name]) } catch {}
      await c.query('commit')
      await audit(req as any,'create','client', nodeId, null, { name, code })
      return { id: nodeId, name, clientShortCode: code }
    } catch(e){ try{ await c.query('rollback') }catch{} throw e } finally { c.release() }
  }

  @Get('clients/:id')
  async getClient(@Param('id') id:string){ const c=await pool.connect(); try{ const n=await c.query("select id,name from authz.nodes where id=$1 and type='client'",[id]); const node=n.rows[0]; if(!node) throw new BadRequestException('not found'); const cc=await c.query('select code from clients where org_id=$1 limit 1',[id]); return { id, name: node.name, clientShortCode: cc.rows[0]?.code || null } } finally { c.release() } }

  // Create invitation (email or sms)
  @Post('invitations')
  async invite(@Body() body:any, req?: any){
    const { clientId, contact, roleId, expiresInHours=72 } = body||{}
    if (!clientId || !contact || (!contact.email && !contact.phone)) throw new BadRequestException('clientId and contact.email|phone required')
    const c = await pool.connect(); try {
      const cl = await c.query('select id,name from authz.nodes where id=$1 and type=$2',[clientId,'client']); const clientNode=cl.rows[0]; if(!clientNode) throw new BadRequestException('invalid clientId')
      const code = (await c.query('select code from clients where org_id=$1 limit 1',[clientId])).rows[0]?.code
      if (!code) throw new BadRequestException('missing client short code')
      const token = Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)
      const exp = new Date(Date.now()+Number(expiresInHours)*3600*1000)
      const delivery = contact.email && contact.phone ? 'both' : contact.email ? 'email' : 'sms'
      await c.query('insert into client_invites(org_id, client_id, email, phone, role, role_id, token_hash, expires_at, revoked, delivery) values ($1,$2,$3,$4,$5,$6,$7,$8,false,$9)', [clientId, clientId, contact.email? String(contact.email).toLowerCase():null, contact.phone? String(contact.phone):null, null, roleId||null, require('crypto').createHash('sha256').update(token).digest('hex'), exp.toISOString(), delivery])
      if (contact.email) { try { await sendInviteEmail(contact.email, token, { clientName: clientNode.name }) } catch(e) { console.warn('email fail',e) } }
      if (contact.phone) { try { await sendInviteSms(contact.phone, token, { shortCode: code }) } catch (e) { console.warn('sms fail', e) } }
      await audit(req as any,'create','invite', String(clientId), null, { delivery, email: contact.email||null, phone: contact.phone||null })
      return { ok:true, shortCode: code, invite_token: token, expires: exp.toISOString() }
    } finally { c.release() }
  }

  // Accept invite via path form
  @Post('register/:short/:token')
  async acceptViaPath(@Param('short') short:string, @Param('token') token:string, @Body() body:any, req?: any){
    const { username, password } = body||{}
    if (!password) throw new BadRequestException('password required')
    const c = await pool.connect(); try {
      const cl = await c.query('select id from clients where code=$1', [String(short).toLowerCase()]); const clientRow=cl.rows[0]; if (!clientRow) throw new BadRequestException('invalid short code')
      const hash = require('crypto').createHash('sha256').update(String(token)).digest('hex')
      const iv = await c.query('select id, org_id, client_id, email, phone, role, role_id, expires_at, used_at, revoked from client_invites where token_hash=$1', [hash])
      const inv = iv.rows[0]; if (!inv) throw new BadRequestException('invalid invite')
      if (inv.revoked || inv.used_at || new Date(inv.expires_at).getTime() < Date.now()) throw new BadRequestException('invite not valid')
      await validatePassword(c, String(password))
      const pw = await hashPassword(String(password))
      const code = String(short).toLowerCase()
      const uIns = await c.query('insert into users(org_id,email,username,password_hash) values ($1,$2,$3,$4) returning id,email,username',[code, String(inv.email||'').toLowerCase() || null, username || null, pw])
      const user=uIns.rows[0]
      await c.query('insert into memberships(user_id, org_id, role) values ($1,$2,$3) on conflict do nothing', [user.id, clientRow.id, inv.role || 'user'])
      await c.query('insert into client_members(user_id, client_id, role) values ($1,$2,$3) on conflict do nothing', [user.id, clientRow.id, inv.role || 'user'])
      await c.query('update client_invites set used_at=now() where id=$1', [inv.id])
      await audit(req as any,'update','invite.accept', inv.id, null, { user_id: user.id })
      return { ok:true }
    } finally { c.release() }
  }

  // Capabilities for current user (flattened)
  @Get('capabilities/me')
  async capsMe(@Req() req: Request){
    const userId = (req as any)?.auth?.userId; if (!userId) throw new BadRequestException('unauthorized')
    const c = await pool.connect(); try {
      const r = await c.query(`with ur as (
        select max(r.level) as lvl from authz.role_assignments ra join authz.roles r on r.id=ra.role_id where ra.user_id=$1)
        select p.domain, p.resource_type, p.action_name from authz.permissions p join ur on ur.lvl >= (select level from authz.roles where id=p.min_role_id)`,[userId])
      return { capabilities: r.rows.map(row=>({ key: `${row.domain}.${row.resource_type}.${row.action_name}`, actions:[row.action_name] })) }
    } finally { c.release() }
  }

  @Post('roles/assign')
  async assignRole(@Body() body:any){ const { userId, nodeId, roleId } = body||{}; if(!userId||!nodeId||!roleId) throw new BadRequestException('missing'); const c=await pool.connect(); try{ const r=await c.query('insert into authz.role_assignments(id,user_id,node_id,role_id) values (gen_random_uuid(),$1,$2,$3) returning id',[userId,nodeId,roleId]); return r.rows[0] } finally{ c.release() } }
  @Post('roles/assign/:id/delete')
  async revokeRole(@Param('id') id:string){ const c=await pool.connect(); try{ await c.query('delete from authz.role_assignments where id=$1',[id]); return { ok:true } } finally{ c.release() } }
}
