import { Controller, Get, Post, Patch, Delete, Param, Body, BadRequestException, UseGuards, Query } from '@nestjs/common'
import { pool } from './db.js'
import { audit } from './audit.js'
import { Authz, RbacGuard } from './authz/rbac.guard.js'

const TYPES = new Set(['org','client','company','department','team','group'])

function normSlug(s: string) { return String(s || '').toLowerCase().replace(/[^a-z0-9_]+/g,'_').replace(/^_+|_+$/g,'') || 'node' }

@Controller('nodes')
@UseGuards(RbacGuard)
export class NodesController {
  @Get(':id')
  async get(@Param('id') id: string) {
    const c = await pool.connect(); try {
      const r = await c.query('select id,type,slug,name,parent_id,path::text as path,attrs from authz.nodes where id=$1',[id]);
      const row = r.rows[0]; if (!row) throw new BadRequestException('not found'); return row
    } finally { c.release() }
  }

  @Get(':id/children')
  async children(@Param('id') id: string) {
    const c = await pool.connect(); try {
      const r = await c.query('select id,type,slug,name,parent_id,path::text as path,attrs from authz.nodes where parent_id=$1 order by slug asc',[id]);
      return { rows: r.rows }
    } finally { c.release() }
  }

  @Post()
  @Authz({ action:'create', domain:'node', resourceType:'client', resourceParam:'parent_id' })
  async create(@Body() body: any, req?: any) {
    const { id, type, slug, name, parent_id, attrs } = body || {}
    if (!TYPES.has(String(type))) throw new BadRequestException('invalid type')
    if (!name) throw new BadRequestException('name required')
    const c = await pool.connect();
    try {
      let parentPath: string | null = null
      if (parent_id) {
        const p = await c.query('select path::text as path from authz.nodes where id=$1', [parent_id])
        parentPath = p.rows[0]?.path || null
        if (!parentPath) throw new BadRequestException('invalid parent_id')
      }
      const s = normSlug(slug || name)
      const path = parentPath ? `${parentPath}.${s}` : s
      const sql = 'insert into authz.nodes(id,type,slug,name,parent_id,path,attrs) values (coalesce($1,gen_random_uuid()),$2,$3,$4,$5,$6::ltree,$7::jsonb) returning id,type,slug,name,parent_id,path::text as path,attrs'
      const { rows } = await c.query(sql, [id || null, type, s, name, parent_id || null, path, attrs || {}])
      await audit(req as any,'create','authz.node', rows[0]?.id, null, rows[0])
      return rows[0]
    } finally { c.release() }
  }

  @Patch(':id')
  @Authz({ action:'update', domain:'node', resourceType:'client', resourceParam:'id' })
  async update(@Param('id') id: string, @Body() body: any, req?: any) {
    const { name, attrs } = body || {}
    if (!name && !attrs) throw new BadRequestException('nothing to update')
    const c = await pool.connect(); try {
      const before = (await c.query('select id,type,slug,name,parent_id,path::text as path,attrs from authz.nodes where id=$1',[id])).rows[0]
      const { rows } = await c.query('update authz.nodes set name=coalesce($2,name), attrs=coalesce($3::jsonb,attrs) where id=$1 returning id,type,slug,name,parent_id,path::text as path,attrs',[id, name || null, attrs || null])
      const row = rows[0]; if (!row) throw new BadRequestException('not found'); await audit(req as any,'update','authz.node', id, before, row); return row
    } finally { c.release() }
  }

  @Delete(':id')
  @Authz({ action:'delete', domain:'node', resourceType:'client', resourceParam:'id' })
  async remove(@Param('id') id: string, req?: any) {
    const c = await pool.connect(); try {
      const before = (await c.query('select id,type,slug,name,parent_id,path::text as path,attrs from authz.nodes where id=$1',[id])).rows[0]
      const r = await c.query('delete from authz.nodes where id=$1 returning id',[id])
      if (!r.rows[0]) throw new BadRequestException('not found')
      await audit(req as any,'delete','authz.node', id, before, null)
      return { ok: true }
    } finally { c.release() }
  }
}
