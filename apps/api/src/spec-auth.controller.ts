import { Controller, Post, Body, Req, Get } from '@nestjs/common'
import type { Request } from 'express'
import { pool } from './db.js'
import { signToken, randomToken, sha256hex, verifyPassword, scryptHash } from './auth.util.js'

@Controller('api')
export class SpecAuthController {
  @Post('login')
  async login(@Body() body:any){
    const { shortCode, username, password } = body||{}
    if (!shortCode || !username || !password) return { error: 'shortCode, username, password required' }
    const client = await pool.connect()
    try {
      const c = await client.query('select c.id as client_id, c.code as client_code, o.id as org_id from clients c join organizations o on o.id=c.org_id where c.code=$1', [String(shortCode).toLowerCase()])
      const row = c.rows[0]; if (!row) return { error: 'invalid credentials' }
      const u = await client.query('select id, email, username, password_hash from users where lower(email)=lower($1) or lower(username)=lower($1)', [username])
      const user = u.rows[0]; if (!user) return { error: 'invalid credentials' }
      const m = await client.query('select role from memberships where user_id=$1 and org_id=$2', [user.id, row.org_id])
      const membership = m.rows[0]; if (!membership) return { error: 'invalid credentials' }
      if (!verifyPassword(password, user.password_hash)) return { error: 'invalid credentials' }
      // compute perms via roles/role_permissions
      let perms: string[] = []
      const rp = await client.query(
        `select p.key from memberships m
         left join roles r on r.id = m.role_id
         left join role_permissions rp on rp.role_id = r.id
         left join permissions p on p.id = rp.permission_id
         where m.user_id=$1 and m.org_id=$2`, [user.id, row.org_id])
      perms = rp.rows.map((x:any)=>x.key).filter(Boolean)
      const token = signToken({ userId:String(user.id), email:user.email, orgId:row.client_code, roles:[membership.role], orgUUID:String(row.org_id), clientCode:String(row.client_code), clientId:String(row.client_id), perms }, process.env.AUTH_SECRET || 'dev-secret-change-me')
      const refresh = randomToken(32)
      const hash = sha256hex(refresh)
      const exp = new Date(Date.now() + 30*24*3600*1000)
      await client.query('insert into refresh_tokens(user_id, token_hash, expires_at) values ($1,$2,$3)', [user.id, hash, exp.toISOString()])
      return { accessToken: token, refreshToken: refresh, capabilities: perms.map(k=>({ key:k, actions:['read'] })) }
    } finally { client.release() }
  }
}

