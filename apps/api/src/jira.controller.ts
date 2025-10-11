import { BadRequestException, Controller, Get, Post, Query, Req } from '@nestjs/common'
import { jiraOps, requeueStale, backfillInProgress } from './jira-backfill.js'
import { pool } from './db.js'

@Controller('jira')
export class JiraController {
  @Get('stale')
  async getStale(@Query('minutes') minutes?: string){
    const domain = process.env.JIRA_DOMAIN || ''
    const email = process.env.JIRA_EMAIL || ''
    const apiToken = process.env.JIRA_API_TOKEN || ''
    const project = process.env.JIRA_PROJECT_KEY || 'AVNZ'
    const m = Math.max(5, Number(minutes || '30'))
    if (!domain || !email || !apiToken) throw new BadRequestException('missing_jira_env')
    const basic = Buffer.from(`${email}:${apiToken}`).toString('base64')
    const jql = encodeURIComponent(`project = ${project} AND statusCategory != Done AND updated <= -${m}m ORDER BY updated DESC`)
    const url = `https://${domain}/rest/api/3/search?jql=${jql}&maxResults=100&fields=key,summary,status,updated,assignee`
    const r = await fetch(url, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
    if (!r.ok) return { issues: [], minutes: m, ok:false, status: r.status }
    const data: any = await r.json().catch(()=>({ issues: [] }))
    const issues = (data.issues || []).map((it:any)=> ({
      key: it?.key,
      summary: it?.fields?.summary || '',
      status: it?.fields?.status?.name || '',
      updated: it?.fields?.updated || null,
      assignee: it?.fields?.assignee?.displayName || null,
    }))
    return { ok:true, minutes: m, issues }
  }

  @Post('requeue-stale')
  async requeue(@Req() req: any, @Query('minutes') minutes?: string){
    const token = String(req.headers['x-service-token'] || '')
    const expected = process.env.SERVICE_TOKEN || ''
    const roles: string[] = Array.isArray(req?.auth?.roles) ? req.auth.roles : []
    const allowViaUser = roles.includes('portal-manager')
    if (!((expected && token === expected) || allowViaUser)) throw new BadRequestException('unauthorized')
    const m = Math.max(5, Number(minutes || '30'))
    const r = await requeueStale(m).catch(()=>({ ok:false }))
    return { ok: !!(r as any)?.ok, minutes: m, ...(r as any) }
  }

  @Post('backfill')
  async backfill(@Req() req: any){
    const token = String(req.headers['x-service-token'] || '')
    const expected = process.env.SERVICE_TOKEN || ''
    const roles: string[] = Array.isArray(req?.auth?.roles) ? req.auth.roles : []
    const allowViaUser = roles.includes('portal-manager')
    if (!((expected && token === expected) || allowViaUser)) throw new BadRequestException('unauthorized')
    const r = await backfillInProgress().catch(()=>({ ok:false }))
    return { ok: !!(r as any)?.ok, ...(r as any) }
  }

  @Get('health')
  async health(){
    return {
      ok: true,
      backfill: jiraOps.backfill,
      requeue: jiraOps.requeue,
      at: Date.now(),
    }
  }

  @Get('jobs')
  async listJobs(@Query('limit') limit?: string, @Query('orgCode') orgCode?: string, @Query('orgId') orgId?: string){
    const lim = Math.max(1, Math.min(200, Number(limit || '50')))
    const c = await pool.connect()
    try {
      let resolvedOrgId: string | null = null
      if (orgId && /[0-9a-fA-F-]{8,}/.test(orgId)) {
        resolvedOrgId = orgId
      } else {
        const code = String(orgCode || process.env.JIRA_DEFAULT_ORG_CODE || '').trim()
        if (code) {
          const r = await c.query('select id from organizations where lower(code)=lower($1) limit 1',[code])
          resolvedOrgId = r.rows[0]?.id || null
        }
      }
      let sql = 'select issue_key, job_id, status, created_at from jira_jobs'
      const args: any[] = []
      if (resolvedOrgId) { sql += ' where org_id=$1'; args.push(resolvedOrgId) }
      sql += ' order by created_at desc limit ' + lim
      const { rows } = await c.query(sql, args)
      return { ok: true, rows, orgId: resolvedOrgId }
    } finally { c.release() }
  }
}
