import { Controller, Get, Post, Body, BadRequestException, Req, ForbiddenException } from '@nestjs/common'
import type { Request } from 'express'
import { pool, getClientForReq } from './db.js'
import { audit } from './audit.js'

@Controller('projects')
export class ProjectsController {
  @Get('mine')
  async mine(@Req() req: Request & { auth?: any }) {
    const org = req.auth?.orgUUID
    if (!org) throw new BadRequestException('org required')
    const userId = req.auth?.userId
    const perms: string[] = req.auth?.perms || []
    const clientId: string | undefined = (req.auth as any)?.clientId
    const client = await getClientForReq(req as any)
    try {
      if (perms.includes('manage_projects') || perms.includes('admin')) {
        const { rows } = await client.query('select id, code, name from projects where org_id=$1 order by name asc', [org])
        return { rows }
      }
      // Client-scoped users: restrict to projects under their client
      if (clientId) {
        const { rows } = await client.query(
          `select p.id, p.code, p.name
           from projects p
           join project_members pm on pm.project_id=p.id and pm.user_id=$1
           where p.org_id=$2 and p.client_id=$3
           group by p.id
           order by p.name asc`,
          [userId, org, clientId]
        )
        return { rows }
      }
      const { rows } = await client.query(
        `select p.id, p.code, p.name
         from projects p
         join project_members pm on pm.project_id=p.id and pm.user_id=$1
         where p.org_id=$2
         group by p.id
         order by p.name asc`,
        [userId, org]
      )
      return { rows }
    } finally { client.release() }
  }
  @Get()
  async list(@Req() req: Request & { auth?: any }) {
    const org = req.auth?.orgUUID
    if (!org) throw new BadRequestException('org required')
    const perms: string[] = req.auth?.perms || []
    if (!perms.includes('manage_projects') && !perms.includes('admin')) throw new ForbiddenException('manage_projects required')
    const client = await getClientForReq(req as any)
    try {
      const url = new URL(req.url, 'http://local')
      const q = url.searchParams.get('q') || ''
      const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')||'20')))
      const offset = Math.max(0, Number(url.searchParams.get('offset')||'0'))
      let sql = 'select p.id, p.code, p.name, p.created_at, p.client_id, c.code as client_code from projects p left join clients c on c.id=p.client_id where p.org_id=$1'
      const args: any[] = [org]
      if (q) { args.push(`%${q.toLowerCase()}%`); sql += ` and (lower(p.code) like $${args.length} or lower(p.name) like $${args.length})` }
      sql += ' order by p.created_at desc'
      sql += ` limit ${limit} offset ${offset}`
      const { rows } = await client.query(sql, args)
      return { rows, limit, offset, q }
    } finally { client.release() }
  }

  @Post()
  async create(@Req() req: Request & { auth?: any }, @Body() body: any) {
    const org = req.auth?.orgUUID
    if (!org) throw new BadRequestException('org required')
    const perms: string[] = req.auth?.perms || []
    if (!perms.includes('manage_projects') && !perms.includes('admin')) throw new ForbiddenException('manage_projects required')
    const { code, name, client_code } = body || {}
    if (!name) throw new BadRequestException('name required')
    const client = await getClientForReq(req as any)
    try {
      let clientId: string | null = null
      if (client_code) {
        const c = await client.query('select id from clients where org_id=$1 and code=$2', [org, String(client_code).toLowerCase()])
        clientId = c.rows[0]?.id || null
        if (!clientId) throw new BadRequestException('invalid client_code')
      }
      const { rows } = await client.query(
        'insert into projects(org_id, client_id, code, name) values ($1,$2,$3,$4) returning id, code, name, created_at, client_id',
        [org, clientId, code || null, name]
      )
      const proj = rows[0]
      await audit(req as any, 'create', 'project', proj.id, null, proj)
      return proj
    } finally { client.release() }
  }
}
