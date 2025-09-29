import { BadRequestException, Controller, Get, Post, Query, Req, Param, ForbiddenException } from '@nestjs/common'
import crypto from 'node:crypto'
import { pool } from './db.js'
import { getServiceConfig } from './service-config.js'

function timingSafeEqual(a: string, b: string){
  try {
    const ab = Buffer.from(a, 'utf8'); const bb = Buffer.from(b, 'utf8');
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb)
  } catch { return false }
}

@Controller('jira')
export class JiraController {
  // Resolve a phase assignee name from org-scoped service configs or env
  private async getPhaseAssigneeName(phase: string, orgId?: string): Promise<string|undefined> {
    try {
      if (orgId) {
        const key = `assignee_${phase}`
        const cfg = await getServiceConfig(orgId, null, 'jira', key)
        if (cfg) {
          const picked = await this.pickFromList(cfg, orgId, phase)
          if (picked) return picked
        }
      }
    } catch {}
    const envKey = `JIRA_ASSIGNEE_${String(phase||'').toUpperCase()}`
    const v = process.env[envKey]
    if (v) return v
    const listEnv = process.env[envKey + '_LIST']
    if (listEnv) {
      const picked = await this.pickFromList(listEnv, orgId, phase)
      if (picked) return picked
    }
    return undefined
  }

  // Accept CSV/semicolon/whitespace-separated list; do round-robin across names using Redis.
  private async pickFromList(listVal: string, orgId: string|undefined, phase: string): Promise<string|undefined> {
    const raw = String(listVal || '')
    const parts = raw.split(/[;,\n]+/).map(s => s.trim()).filter(Boolean)
    if (parts.length === 0) return undefined
    if (parts.length === 1) return parts[0]
    // try RR via Redis; else random
    // Simplified: no Redis dependency here; fallback to pseudo round-robin via random
    return parts[Math.floor(Math.random() * parts.length)]
  }

  private async chooseAssigneeForPhase(phase: string, orgId: string|undefined, domain: string, basic: string): Promise<{ name?: string, accountId?: string }|undefined> {
    // Build exclusion list: never auto-assign to CTO or configured excludes
    const exclude = await this.getAssignmentExclude(orgId)
    // Prefer service config list, then env list/single
    let rawList = ''
    try {
      if (orgId) {
        const cfg = await getServiceConfig(orgId, null, 'jira', `assignee_${phase}`)
        if (cfg) rawList = cfg
      }
    } catch {}
    if (!rawList) {
      const envKey = `JIRA_ASSIGNEE_${String(phase||'').toUpperCase()}`
      rawList = process.env[envKey + '_LIST'] || process.env[envKey] || ''
    }
    const names = String(rawList || '')
      .split(/[;,\n]+/)
      .map(s=>s.trim())
      .filter(Boolean)
      .map(s=> this.normalizeName(s))
      .filter(n => !exclude.has(n.toLowerCase()))
    if (names.length === 0) return undefined
    if (names.length === 1) {
      const acct = await this.resolveAccountId(names[0], domain, basic)
      return acct ? { name: names[0], accountId: acct } : undefined
    }
    // Load-balance by least open issues in project; fallback to RR
    let doLB = (process.env.JIRA_LOAD_BALANCE||'1') === '1'
    try {
      if (orgId) {
        const lbCfg = await getServiceConfig(orgId, null, 'jira', 'load_balance')
        if (typeof lbCfg === 'string' && lbCfg.length > 0) doLB = (lbCfg === '1' || lbCfg.toLowerCase() === 'true')
      }
    } catch {}
    if (doLB) {
      const counts: Array<{ name:string, accountId?:string, open:number }> = []
      const project = process.env.JIRA_PROJECT_KEY || 'AVNZ'
      for (const n of names) {
        if (exclude.has(n.toLowerCase())) continue
        const acct = await this.resolveAccountId(n, domain, basic)
        if (!acct) { counts.push({ name:n, open: 1e9 }); continue }
        try {
          const jql = encodeURIComponent(`project = ${project} AND assignee = ${acct} AND statusCategory != Done`)
          const url = `https://${domain}/rest/api/3/search?jql=${jql}&maxResults=0`
          const r = await fetch(url, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
          const js: any = await r.json().catch(()=>({ total: 999 }))
          counts.push({ name:n, accountId: acct, open: Number(js.total||0) })
        } catch { counts.push({ name:n, accountId: acct, open: 999 }) }
      }
      counts.sort((a,b)=> a.open - b.open)
      const chosen = counts[0]
      if (chosen?.accountId) return { name: chosen.name, accountId: chosen.accountId }
    }
    // RR fallback
    const pickedName = await this.pickFromList(names.join(','), orgId, phase)
    const acct = pickedName ? await this.resolveAccountId(pickedName, domain, basic) : undefined
    return acct ? { name: pickedName!, accountId: acct } : undefined
  }

  // Never auto-assign to CTO or other excluded identities
  private async getAssignmentExclude(orgId?: string): Promise<Set<string>> {
    const ex: string[] = []
    try {
      if (orgId) {
        const cfg = await getServiceConfig(orgId, null, 'jira', 'assignment_exclude')
        if (cfg) ex.push(String(cfg))
      }
    } catch {}
    const env = process.env.JIRA_ASSIGNMENT_EXCLUDE || ''
    if (env) ex.push(env)
    // Always include Company CTO
    ex.push('Bill Cuevas', 'bill.cuevas@avnz.io')
    const set = new Set<string>()
    ex.join(',')
      .split(/[;,\n]+/)
      .map(s=> this.normalizeName(String(s||'')).toLowerCase())
      .filter(Boolean)
      .forEach(s=> set.add(s))
    return set
  }

  private normalizeName(s: string): string {
    // Support display annotations like "Name|Title" or "Name (Title)"; return just the name part
    if (!s) return s
    const pipeIdx = s.indexOf('|')
    if (pipeIdx > -1) return s.slice(0, pipeIdx).trim()
    const parenIdx = s.indexOf('(')
    if (parenIdx > -1) return s.slice(0, parenIdx).trim()
    return s
  }
  // Automation/webhook receiver: configure Jira Automation to send a web request here.
  // Header: X-Jira-Secret: <shared_secret>
  // Body: JSON with at least { event, issue: { id, key, fields? }, user? }
  @Post('events/:orgCode')
  async handleEvent(@Param('orgCode') orgCode: string, @Req() req: any){
    const raw = req?.rawBody as Buffer | undefined
    const bodyStr = raw ? raw.toString('utf8') : JSON.stringify(req.body||{})
    let payload: any
    try { payload = JSON.parse(bodyStr) } catch { payload = req.body || {} }

    const client = await pool.connect()
    try {
      // Resolve org UUID from orgCode
      const org = await client.query('select id from organizations where lower(code)=lower($1) limit 1', [String(orgCode)])
      const orgId: string | undefined = org.rows[0]?.id
      if (!orgId) throw new BadRequestException('unknown org')

      // Shared secret: prefer org-scoped service config, else env override
      const cfgSecret = await getServiceConfig(orgId, null, 'jira', 'webhook_secret')
      const envSecret = process.env.JIRA_WEBHOOK_SECRET
      const secret = cfgSecret || envSecret
      if (!secret) throw new BadRequestException('jira webhook secret not configured for org')

      const headerSecret = String(req.headers['x-jira-secret']||req.headers['x-jira-webhook-secret']||'')
      if (!headerSecret || !timingSafeEqual(secret, headerSecret)) throw new BadRequestException('invalid secret')

      const issue = payload.issue || payload.data?.issue || {}
      const issueKey = issue.key || payload.key || null
      const issueId = issue.id || null
      const eventType = payload.event || payload.webhookEvent || payload.action || 'webhook'
      const actor = payload.user || payload.actor || null

      await client.query(
        `insert into jira_events(org_id, client_id, issue_key, issue_id, event_type, actor, payload)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [orgId, null, issueKey, issueId, String(eventType), actor? JSON.stringify(actor): null, JSON.stringify(payload)]
      )
      // Enrich newly created issues with guidance without overwriting description
      try {
        const et = String(eventType || '').toLowerCase()
        if (issueKey && (et.includes('issue_created') || et.includes('jira:issue_created') || et === 'issue_created')) {
          // Post a comment prompting specifics and add needs-details label, but do not replace description
          const domain = process.env.JIRA_DOMAIN || ''
          const email = process.env.JIRA_EMAIL || ''
          const apiToken = process.env.JIRA_API_TOKEN || ''
          if (domain && email && apiToken) {
            const basic = Buffer.from(`${email}:${apiToken}`).toString('base64')
            const msg = 'Please add concrete, ticket-specific details (Context, User Story, Acceptance Criteria, Testing & QA). Avoid placeholders like <role>/<capability>. The portal will auto-transition only after details are present.'
            await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, { method:'POST', headers:{ 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ body: msg }) })
            try {
              // add needs-details label non-destructively
              const r0 = await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=labels`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
              const j0: any = await r0.json().catch(()=>({}))
              const labels: string[] = Array.isArray(j0?.fields?.labels)? j0.fields.labels : []
              const next = Array.from(new Set([...(labels||[]), 'needs-details']))
              await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}`, { method:'PUT', headers:{ 'Authorization': `Basic ${basic}`, 'Content-Type':'application/json' }, body: JSON.stringify({ fields: { labels: next } }) })
            } catch {}
          }
        }
      } catch {}
      // Auto-queue when issue is moved to In Progress
      try {
        const fields = issue.fields || {}
        const statusName = String(fields.status?.name || '').toLowerCase()
        let transitionedToInProgress = statusName === 'in progress'
        // Check changelog if present
        const changelog = payload.changelog || payload.changeLog || {}
        const items: any[] = changelog.items || []
        for (const it of items) {
          if (String(it.field || '').toLowerCase() === 'status' && String(it.toString || '').toLowerCase() === 'in progress') {
            transitionedToInProgress = true
          }
        }
        if (issueKey && transitionedToInProgress) {
          // Dedup: if already have a job record, skip
          const existing = await client.query('select job_id from jira_jobs where org_id=$1 and issue_key=$2 and deleted_at is null limit 1', [orgId, issueKey])
          if (existing.rows.length === 0) {
            const taskText = `[Jira ${issueKey}] ${fields.summary || 'No summary'}\n\n${fields.description || ''}`
            const assigneeNameInit = fields?.assignee?.displayName || undefined
            const body = JSON.stringify({ task: taskText, meta: { org_id: orgId, jira_issue_key: issueKey, phase: 'dev', assigned_to: assigneeNameInit } })
            const aiBase = process.env.AI_BASE_INTERNAL || 'http://ai:8000'
            const r = await fetch(`${aiBase}/agents/jobs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
            const j = await r.json().catch(()=>({})) as any
            const jobId = j.job_id || j.id || null
            if (jobId) {
              await client.query('insert into jira_jobs(org_id, issue_key, job_id, status) values ($1,$2,$3,$4)', [orgId, issueKey, jobId, 'queued'])
              console.log('[jira-webhook] queued', issueKey, jobId)
            } else {
              console.log('[jira-webhook] failed to queue', issueKey, r.status)
            }
            // Assign initial dev phase based on availability unless an assignee is already selected
            try {
              const domain = process.env.JIRA_DOMAIN || ''
              const email = process.env.JIRA_EMAIL || ''
              const apiToken = process.env.JIRA_API_TOKEN || ''
              if (domain && email && apiToken) {
                const basic = Buffer.from(`${email}:${apiToken}`).toString('base64')
                // Only assign if no current assignee
                const infoRes = await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=assignee`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
                const info: any = await infoRes.json().catch(()=>({}))
                const curr = info?.fields?.assignee?.accountId
                if (!curr) {
                  const chosen = await this.chooseAssigneeForPhase('dev', orgId, domain, basic)
                  if (chosen?.accountId) {
                    await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}/assignee`, { method: 'PUT', headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: chosen.accountId }) })
                  }
                }
              }
            } catch {}
          }
        }
      } catch {}
      return { ok: true }
    } finally { client.release() }
  }

  // Admin list endpoint (org scoped)
  @Get('events')
  async list(@Req() req:any, @Query('limit') limit?: string, @Query('offset') offset?: string){
    const orgUUID = req?.auth?.orgUUID
    if (!orgUUID) throw new BadRequestException('unauthorized')
    const roles: string[] = Array.isArray(req?.auth?.roles) ? req.auth.roles : []
    if (!(roles||[]).includes('portal-manager')) {
      const perms: string[] = Array.isArray(req?.auth?.perms) ? req.auth.perms : []
      if (!perms.includes('admin') && !perms.includes('manage_projects') && !perms.includes('view_usage')) {
        throw new ForbiddenException('insufficient permissions')
      }
    }
    const c = await pool.connect();
    try {
      const lim = Math.max(1, Math.min(200, Number(limit||'50')))
      const off = Math.max(0, Number(offset||'0'))
      const r = await c.query(
        `select id, issue_key, issue_id, event_type, created_at
           from jira_events
          where org_id=$1 and deleted_at is null
          order by created_at desc
          limit $2 offset $3`,
        [orgUUID, lim, off]
      )
      return { rows: r.rows, limit: lim, offset: off }
    } finally { c.release() }
  }

  // List recent agent jobs with Jira linkage
  @Get('jobs')
  async jobs(@Req() req:any, @Query('limit') limit?: string){
    const orgUUID = req?.auth?.orgUUID
    if (!orgUUID) throw new BadRequestException('unauthorized')
    const roles: string[] = Array.isArray(req?.auth?.roles) ? req.auth.roles : []
    if (!(roles||[]).includes('org') && !(roles||[]).includes('admin')) {
      const perms: string[] = Array.isArray(req?.auth?.perms) ? req.auth.perms : []
      if (!perms.includes('view_usage')) throw new ForbiddenException('insufficient permissions')
    }
    const aiBase = process.env.AI_BASE_INTERNAL || 'http://ai:8000'
    const lim = Math.max(1, Math.min(200, Number(limit||'50')))
    try {
      const r = await fetch(`${aiBase}/agents/jobs?limit=${lim}`, { headers: { 'accept':'application/json' } })
      if (!r.ok) return { rows: [] }
      const data: any = await r.json().catch(()=>({ rows: [] }))
      const rows = (data.rows||[]).filter((j:any)=> j?.meta?.jira_issue_key).map((j:any)=> ({
        id: j.id,
        status: j.status,
        created_at: j.created_at ? new Date(Number(j.created_at||0)*1000).toISOString() : null,
        finished_at: j.finished_at ? new Date(Number(j.finished_at||0)*1000).toISOString() : null,
        phase: j.meta?.phase || null,
        assigned_to: j.meta?.assigned_to || null,
        issue_key: j.meta?.jira_issue_key || null,
        task: j.task || '',
      }))
      return { rows }
    } catch { return { rows: [] } }
  }

  // List stale Jira issues (statusCategory != Done and not updated within N minutes)
  @Get('stale')
  async stale(@Req() req:any, @Query('minutes') minutes?: string){
    const orgUUID = req?.auth?.orgUUID
    if (!orgUUID) throw new BadRequestException('unauthorized')
    const roles: string[] = Array.isArray(req?.auth?.roles) ? req.auth.roles : []
    if (!(roles||[]).includes('org') && !(roles||[]).includes('admin')) {
      const perms: string[] = Array.isArray(req?.auth?.perms) ? req.auth.perms : []
      if (!perms.includes('view_usage')) throw new ForbiddenException('insufficient permissions')
    }
    const domain = process.env.JIRA_DOMAIN || ''
    const email = process.env.JIRA_EMAIL || ''
    const apiToken = process.env.JIRA_API_TOKEN || ''
    const project = process.env.JIRA_PROJECT_KEY || 'AVNZ'
    const mins = Math.max(5, Number(minutes || '30'))
    if (!domain || !email || !apiToken) return { issues: [] }
    const basic = Buffer.from(`${email}:${apiToken}`).toString('base64')
    const jql = encodeURIComponent(`project = ${project} AND statusCategory != Done AND updated <= -${mins}m ORDER BY updated DESC`)
    const url = `https://${domain}/rest/api/3/search?jql=${jql}&maxResults=50&fields=summary,status,updated,assignee`
    const r = await fetch(url, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
    if (!r.ok) return { issues: [] }
    const data: any = await r.json().catch(()=>({ issues: [] }))
    const issues = (data.issues||[]).map((it:any)=> ({
      key: it.key,
      summary: it.fields?.summary,
      status: it.fields?.status?.name,
      updated: it.fields?.updated,
      assignee: it.fields?.assignee?.displayName || null,
    }))
    return { issues, minutes: mins }
  }

  // Requeue stale issues by mapping status → phase (dev/review/qa)
  @Post('requeue-stale')
  async requeueStale(@Req() req:any, @Query('minutes') minutes?: string){
    const orgUUID = req?.auth?.orgUUID
    if (!orgUUID) throw new BadRequestException('unauthorized')
    const roles: string[] = Array.isArray(req?.auth?.roles) ? req.auth.roles : []
    if (!(roles||[]).includes('org') && !(roles||[]).includes('admin')) {
      const perms: string[] = Array.isArray(req?.auth?.perms) ? req.auth.perms : []
      if (!perms.includes('admin') && !perms.includes('manage_projects')) {
        throw new ForbiddenException('insufficient permissions')
      }
    }
    const domain = process.env.JIRA_DOMAIN || ''
    const email = process.env.JIRA_EMAIL || ''
    const apiToken = process.env.JIRA_API_TOKEN || ''
    const project = process.env.JIRA_PROJECT_KEY || 'AVNZ'
    const mins = Math.max(5, Number(minutes || '30'))
    if (!domain || !email || !apiToken) return { ok: false, reason: 'missing_jira_env' }
    const basic = Buffer.from(`${email}:${apiToken}`).toString('base64')
    const jql = encodeURIComponent(`project = ${project} AND statusCategory != Done AND updated <= -${mins}m ORDER BY updated DESC`)
    const url = `https://${domain}/rest/api/3/search?jql=${jql}&maxResults=100&fields=summary,status,updated`
    const r = await fetch(url, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
    if (!r.ok) return { ok: false, reason: 'jira_search_failed', status: r.status }
    const data: any = await r.json().catch(()=>({ issues: [] }))
    const aiBase = process.env.AI_BASE_INTERNAL || 'http://ai:8000'
    const c = await pool.connect()
    try {
      let queued = 0
      for (const it of (data.issues||[])){
        const key = it.key
        const statusName = String(it.fields?.status?.name||'').toLowerCase()
        let phase = ''
        if (statusName === 'in progress' || statusName === 'blocked') phase = 'dev'
        else if (statusName === 'in review') phase = 'review'
        else if (statusName === 'qa testing' || statusName === 'qa') phase = 'qa'
        if (!phase) continue
        const exists = await c.query('select 1 from jira_jobs where org_id=$1 and issue_key=$2 and deleted_at is null limit 1', [orgUUID, key])
        if (exists.rows.length > 0) continue
        const summary = String(it.fields?.summary||'')
        const assigneeName = it.fields?.assignee?.displayName || undefined
        const taskText = `[${phase.toUpperCase()} Jira ${key}] Re-run phase ${phase} for stale issue ${key}.\n\n${summary}`
        const body = JSON.stringify({ task: taskText, meta: { org_id: orgUUID, jira_issue_key: key, phase, assigned_to: assigneeName } })
        try {
          const rr = await fetch(`${aiBase}/agents/jobs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
          const jj: any = await rr.json().catch(()=>({}))
          const jobId = jj.job_id || jj.id || null
          if (jobId) { await c.query('insert into jira_jobs(org_id, issue_key, job_id, status) values ($1,$2,$3,$4)', [orgUUID, key, jobId, 'queued']); queued++ }
        } catch {}
      }
      return { ok: true, queued }
    } finally { c.release() }
  }

  // Requeue a single issue by key based on its current status
  @Post('requeue/:key')
  async requeueOne(@Req() req:any, @Param('key') key: string){
    const orgUUID = req?.auth?.orgUUID
    if (!orgUUID) throw new BadRequestException('unauthorized')
    const roles: string[] = Array.isArray(req?.auth?.roles) ? req.auth.roles : []
    if (!(roles||[]).includes('org') && !(roles||[]).includes('admin')) {
      const perms: string[] = Array.isArray(req?.auth?.perms) ? req.auth.perms : []
      if (!perms.includes('admin') && !perms.includes('manage_projects')) {
        throw new ForbiddenException('insufficient permissions')
      }
    }
    if (!key) throw new BadRequestException('missing key')
    const domain = process.env.JIRA_DOMAIN || ''
    const email = process.env.JIRA_EMAIL || ''
    const apiToken = process.env.JIRA_API_TOKEN || ''
    if (!domain || !email || !apiToken) return { ok: false, reason: 'missing_jira_env' }
    const basic = Buffer.from(`${email}:${apiToken}`).toString('base64')
    const infoRes = await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,status,updated,assignee`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
    if (!infoRes.ok) return { ok: false, reason: 'jira_fetch_failed', status: infoRes.status }
    const info: any = await infoRes.json().catch(()=>({}))
    const statusName = String(info?.fields?.status?.name || '').toLowerCase()
    let phase = ''
    if (statusName === 'in progress' || statusName === 'blocked') phase = 'dev'
    else if (statusName === 'in review') phase = 'review'
    else if (statusName === 'qa testing' || statusName === 'qa') phase = 'qa'
    if (!phase) return { ok: false, reason: 'unsupported_status', statusName }
    const c = await pool.connect()
    try {
      const exists = await c.query('select 1 from jira_jobs where org_id=$1 and issue_key=$2 and deleted_at is null limit 1', [orgUUID, key])
      if (exists.rows.length > 0) return { ok: true, queued: 0, reason: 'already_exists' }
      const aiBase = process.env.AI_BASE_INTERNAL || 'http://ai:8000'
      const summary = String(info?.fields?.summary || '')
      const assigneeName = info?.fields?.assignee?.displayName || undefined
      const taskText = `[${phase.toUpperCase()} Jira ${key}] Re-run phase ${phase} for stale issue ${key}.\n\n${summary}`
      const body = JSON.stringify({ task: taskText, meta: { org_id: orgUUID, jira_issue_key: key, phase, assigned_to: assigneeName } })
      const rr = await fetch(`${aiBase}/agents/jobs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
      const jj: any = await rr.json().catch(()=>({}))
      const jobId = jj.job_id || jj.id || null
      if (!jobId) return { ok: false, reason: 'queue_failed', status: rr.status }
      await c.query('insert into jira_jobs(org_id, issue_key, job_id, status) values ($1,$2,$3,$4)', [orgUUID, key, jobId, 'queued'])
      return { ok: true, queued: 1, job_id: jobId, phase }
    } finally { c.release() }
  }

  // AI worker callback when a portal job completes (service-to-service token)
  @Post('agents-complete')
  async onAgentsComplete(@Req() req: any){
    const token = String(req.headers['x-service-token'] || '')
    const expected = process.env.SERVICE_TOKEN || ''
    if (!expected || token !== expected) throw new BadRequestException('unauthorized')
    const body = req.body || {}
    const jobId = String(body.job_id || '')
    const issueKey = String(body.jira_issue_key || '')
    const phase = String((body.meta?.phase)||'').toLowerCase() || 'dev'
    if (!jobId || !issueKey) throw new BadRequestException('missing job_id or jira_issue_key')
    // Update jira_jobs status, then comment on the issue
    const c = await pool.connect()
    try {
      await c.query('update jira_jobs set status=$1, updated_at=now() where issue_key=$2 and deleted_at is null', ['done', issueKey])
    } finally { c.release() }
    // Post comment to Jira
    const domain = process.env.JIRA_DOMAIN || ''
    const email = process.env.JIRA_EMAIL || ''
    const apiToken = process.env.JIRA_API_TOKEN || ''
    if (domain && email && apiToken) {
      const basic = Buffer.from(`${email}:${apiToken}`).toString('base64')
      const url = `https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`
      const result = body.result || {}
      const usage = (result && result.usage) || {}
      const plan = (result && result.plan) || ''
      const impl = (result && result.implementation) || ''
      const review = (result && result.review) || ''
      const content = [
        `Portal job ${jobId} completed (phase=${phase}).`,
        usage ? `Usage: in=${usage.input_tokens||0} out=${usage.output_tokens||0}` : '',
        plan ? `\nPlan:\n${String(plan).slice(0, 1200)}` : '',
        impl ? `\n\nImplementation:\n${String(impl).slice(0, 1200)}` : '',
        review ? `\n\nReview:\n${String(review).slice(0, 1200)}` : ''
      ].filter(Boolean).join('\n')
      await fetch(url, { method: 'POST', headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ body: content }) })

      // If this was a documentation generation job, update the issue description with tailored content (ADF)
      try {
        const isDocgen = String((body.meta?.docgen)||'') === 'true'
        if (isDocgen) {
          // Guard: if generated content contains placeholders, do not update description
          const planTxt = String(result?.plan||'')
          const implTxt = String(result?.implementation||'')
          const revTxt = String(result?.review||'')
          const combined = `${planTxt}\n${implTxt}\n${revTxt}`
          const banned = ['As a <role>', '<capability>', '<benefit>', 'Criteria 1', 'Criteria 2', 'Criteria 3', 'Provide a 2-3 sentence']
          const hasBanned = banned.some((p)=> combined.includes(p))
          if (hasBanned) {
            // add needs-details and comment; skip description update
            try {
              const r0 = await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=labels`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
              const j0: any = await r0.json().catch(()=>({}))
              const labels: string[] = Array.isArray(j0?.fields?.labels)? j0.fields.labels : []
              const next = Array.from(new Set([...(labels||[]), 'needs-details']))
              await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}`, { method:'PUT', headers:{ 'Authorization': `Basic ${basic}`, 'Content-Type':'application/json' }, body: JSON.stringify({ fields: { labels: next } }) })
              const msg = 'Docgen produced generic content. Skipping description update. Please add ticket-specific details; placeholders are not allowed.'
              await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, { method:'POST', headers:{ 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ body: msg }) })
            } catch {}
            return { ok: true, skipped: 'placeholders_detected' }
          }
          const make = (t:string)=> ({ type:'paragraph', content:[{ type:'text', text:t }] })
          const addSec = (arr:any[], title:string, text:string)=>{
            if (!text) return
            arr.push({ type:'heading', attrs:{ level:3 }, content:[{ type:'text', text:title }] })
            String(text).split('\n').forEach((line)=> arr.push(make(line)))
          }
          const doc:any = { type:'doc', version:1, content:[] }
          addSec(doc.content, 'Next Actions', planTxt)
          addSec(doc.content, 'Implementation Guidance', implTxt)
          addSec(doc.content, 'Review Notes', revTxt)
          // PUT description and set label indicating AI-assisted brief present
          // Preserve existing labels; append auto-briefed
          try {
            const r0 = await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=labels`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
            const j0: any = await r0.json().catch(()=>({}))
            const labels: string[] = Array.isArray(j0?.fields?.labels)? j0.fields.labels : []
            const nextLabels = Array.from(new Set([...(labels||[]), 'auto-briefed']))
            await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
              method:'PUT', headers:{ 'Authorization': `Basic ${basic}`, 'Content-Type':'application/json' },
              body: JSON.stringify({ fields: { description: doc, labels: nextLabels } })
            })
          } catch {
            await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
              method:'PUT', headers:{ 'Authorization': `Basic ${basic}`, 'Content-Type':'application/json' },
              body: JSON.stringify({ fields: { description: doc, labels: ['auto-briefed'] } })
            })
          }
        }
      } catch {}

      // Validate ticket content before any transition
      try {
        const infoRes = await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary,description,labels,priority,issuetype`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
        const info: any = await infoRes.json().catch(()=>({}))
        const desc: string = String(info?.fields?.description || '')
        const hasContext = desc.includes('Context')
        const hasUserStory = desc.includes('User Story')
        const hasAC = desc.includes('Acceptance Criteria')
        const hasQA = desc.includes('Testing & QA') || desc.includes('Testing & QA Details')
        const labels: string[] = Array.isArray(info?.fields?.labels)? info.fields.labels : []
        // Detect placeholder/generic content
        const placeholders = [
          'As a <role>', '<capability>', '<benefit>',
          'Provide a 2-3 sentence problem statement',
          'Criteria 1', 'Criteria 2', 'Criteria 3',
          'Code pointers, endpoints, migrations, flags',
          'Unit/integration tests and manual steps',
          'Risks and rollback steps'
        ]
        const hasPlaceholders = placeholders.some(p => desc.includes(p))

        // Ensure priority is not missing/Lowest — default to Medium unless configured
        try {
          const currPri = info?.fields?.priority?.name
          if (!currPri || String(currPri).toLowerCase() === 'lowest'){
            let defPri = process.env.JIRA_DEFAULT_PRIORITY || 'Medium'
            try { const dp = await getServiceConfig(String(body.meta?.org_id||''), null, 'jira', 'default_priority'); if (dp) defPri = dp } catch {}
            await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}`, { method:'PUT', headers:{ 'Authorization': `Basic ${basic}`, 'Content-Type':'application/json' }, body: JSON.stringify({ fields: { priority: { name: defPri } } }) })
          }
        } catch {}

        // Epic-specific validation: require epic sections
        try {
          const isEpic = String(info?.fields?.issuetype?.name||'').toLowerCase() === 'epic'
          if (isEpic) {
            const reqSections = ['Epic Goal','Scope','Deliverables','Milestones','Success Metrics','Stakeholders','Risks','Definition of Done']
            const missingEpic = reqSections.some(s => !desc.includes(s))
            if (missingEpic || hasPlaceholders) {
              const nextLabels = Array.from(new Set([...(labels||[]), 'needs-epic-details']))
              await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}`, { method:'PUT', headers:{ 'Authorization': `Basic ${basic}`, 'Content-Type':'application/json' }, body: JSON.stringify({ fields: { labels: nextLabels } }) })
              const msg = 'Epic requires: Epic Goal, Scope/Out of Scope, Deliverables, Milestones, Success Metrics, Stakeholders & Dependencies, Risks & Assumptions, Definition of Done. No placeholders.'
              await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, { method:'POST', headers:{ 'Authorization': `Basic ${basic}`, 'Content-Type':'application/json' }, body: JSON.stringify({ body: { type:'doc', version:1, content:[{ type:'paragraph', content:[{ type:'text', text: msg }]}] } }) })
              return { ok: true, note: 'missing_epic_details' }
            }
          }
        } catch {}

        if (!(hasContext && hasUserStory && hasAC && hasQA) || hasPlaceholders){
          // Add needs-details label and comment a reminder; do not transition until complete
          const nextLabels = Array.from(new Set([...(labels||[]), 'needs-details']))
          await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}`, { method:'PUT', headers:{ 'Authorization': `Basic ${basic}`, 'Content-Type':'application/json' }, body: JSON.stringify({ fields: { labels: nextLabels } }) })
          const msg = 'Details required before progressing: please include Context, User Story, Acceptance Criteria, and Testing & QA details tailored to this ticket (no placeholders). The portal will transition only after these are present.'
          await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, { method:'POST', headers:{ 'Authorization': `Basic ${basic}`, 'Content-Type':'application/json' }, body: JSON.stringify({ body: { type:'doc', version:1, content:[{ type:'paragraph', content:[{ type:'text', text: msg }]}] } }) })
          return { ok: true, note: 'missing_details' }
        }
      } catch {}
      // Transition based on phase (only after validation above)
      let target = process.env.JIRA_TRANSITION_ON_COMPLETE || 'In Review'
      if (phase === 'dev' || phase === 'review') target = 'QA Testing'
      if (phase === 'qa' || phase === 'test') target = 'Done'
      if (phase === 'audit') target = ''
      try {
        if (target) {
          const tRes = await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
          const tJson: any = await tRes.json().catch(()=>({ transitions: [] }))
          const trans = (tJson.transitions||[]).find((x:any)=> String(x.name||'').toLowerCase()===String(target).toLowerCase())
          if (trans && trans.id) {
            await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, { method: 'POST', headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ transition: { id: trans.id } }) })
          }
        }
      } catch {}

      // Assign based on availability unless selected: field override → locked label → least-loaded/rr
      try {
        const orgId = String(body.meta?.org_id||'')
        // Prefer explicit field override when present
        const FIELD_ENV: Record<string,string|undefined> = {
          review: process.env.JIRA_REVIEWER_FIELD_ID,
          qa: process.env.JIRA_QA_FIELD_ID,
          test: process.env.JIRA_TEST_FIELD_ID,
          audit: process.env.JIRA_AUDIT_FIELD_ID,
        }
        const fieldId = FIELD_ENV[phase]
        // Read lock label from org config first, fallback to env
        let lockLabel = 'assignee-locked'
        try {
          if (orgId) {
            const ll = await getServiceConfig(orgId, null, 'jira', 'assignment_lock_label')
            if (ll) lockLabel = ll
          }
        } catch {}
        if (!lockLabel) lockLabel = process.env.JIRA_ASSIGNMENT_LOCK_LABEL || 'assignee-locked'
        const fieldsQuery = ['assignee','labels'].concat(fieldId? [fieldId]: []).join(',')
        if (fieldId) {
          const infoRes = await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=${encodeURIComponent(fieldsQuery)}`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
          const info: any = await infoRes.json().catch(()=>({}))
          const user = info?.fields?.[fieldId]
          const acct = user?.accountId || (user && Array.isArray(user) ? user[0]?.accountId : undefined)
          if (acct) {
            await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}/assignee`, { method: 'PUT', headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: acct }) })
            throw new Error('assigned-via-field')
          }
          // If label present to lock assignee, or current assignee exists, skip further assignment
          const labels: string[] = info?.fields?.labels || []
          const curr = info?.fields?.assignee?.accountId
          if ((labels||[]).includes(lockLabel) || curr) throw new Error('assignee-locked-or-present')
        }
        // If no field configured for this phase (or not populated) and no lock/present: choose least-loaded from configured list
        const chosen = await this.chooseAssigneeForPhase(phase, orgId, domain, basic)
        if (chosen?.accountId) {
          await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}/assignee`, { method: 'PUT', headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: chosen.accountId }) })
        }
      } catch {}
    }
    return { ok: true }
  }

  // Manual backfill trigger (service token required)
  @Post('backfill')
  async backfill(@Req() req: any){
    const token = String(req.headers['x-service-token'] || '')
    const expected = process.env.SERVICE_TOKEN || ''
    if (!expected || token !== expected) throw new BadRequestException('unauthorized')
    const mod = await import('./jira-backfill.js')
    const res = await mod.backfillInProgress()
    return res || { ok: true }
  }

  // Assignee load summary (org scoped)
  @Get('assignees/load')
  async assigneeLoad(@Req() req: any){
    const orgUUID = req?.auth?.orgUUID
    if (!orgUUID) throw new BadRequestException('unauthorized')
    const roles: string[] = Array.isArray(req?.auth?.roles) ? req.auth.roles : []
    if (!(roles||[]).includes('org') && !(roles||[]).includes('admin')) {
      const perms: string[] = Array.isArray(req?.auth?.perms) ? req.auth.perms : []
      if (!perms.includes('view_usage')) throw new ForbiddenException('insufficient permissions')
    }
    const domain = process.env.JIRA_DOMAIN || ''
    const email = process.env.JIRA_EMAIL || ''
    const apiToken = process.env.JIRA_API_TOKEN || ''
    const project = process.env.JIRA_PROJECT_KEY || 'AVNZ'
    if (!domain || !email || !apiToken) return { rows: [] }
    const basic = Buffer.from(`${email}:${apiToken}`).toString('base64')
    const c = await pool.connect()
    try {
      // Collect names from per-phase configs
      const phases = ['dev','review','qa','test','audit']
      const nameToPhases = new Map<string, Set<string>>()
      for (const ph of phases){
        const v = await getServiceConfig(orgUUID, null, 'jira', `assignee_${ph}`)
        const list = String(v||'').split(/[;,\n]+/).map(s=>s.trim()).filter(Boolean)
        for (const raw of list){
          const name = this.normalizeName(raw)
          if (!name) continue
          if (!nameToPhases.has(name)) nameToPhases.set(name, new Set())
          nameToPhases.get(name)!.add(ph)
        }
      }
      const rows: any[] = []
      for (const [name, phs] of nameToPhases){
        const acct = await this.resolveAccountId(name, domain, basic)
        if (!acct) { rows.push({ name, account_id: null, open: null, phases: Array.from(phs) }); continue }
        try {
          const jql = encodeURIComponent(`project = ${project} AND assignee = ${acct} AND statusCategory != Done`)
          const url = `https://${domain}/rest/api/3/search?jql=${jql}&maxResults=0`
          const r = await fetch(url, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
          const js: any = await r.json().catch(()=>({ total: 0 }))
          rows.push({ name, account_id: acct, open: Number(js.total||0), phases: Array.from(phs) })
        } catch { rows.push({ name, account_id: acct, open: null, phases: Array.from(phs) }) }
      }
      rows.sort((a,b)=> (a.open??999) - (b.open??999) || a.name.localeCompare(b.name))
      return { rows }
    } finally { c.release() }
  }

  // Manually enrich a single issue (service-to-service)
  @Post('enrich')
  async enrich(@Req() req:any){
    const token = String(req.headers['x-service-token'] || '')
    const expected = process.env.SERVICE_TOKEN || ''
    if (!expected || token !== expected) throw new BadRequestException('unauthorized')
    const key = String((req.body?.key)||'') || String((req.query?.key)||'')
    if (!key) throw new BadRequestException('missing key')
    await this.enrichIssue(key)
    return { ok: true }
  }

  private async enrichIssue(issueKey: string){
    const domain = process.env.JIRA_DOMAIN || ''
    const email = process.env.JIRA_EMAIL || ''
    const apiToken = process.env.JIRA_API_TOKEN || ''
    if (!domain || !email || !apiToken) return
    const basic = Buffer.from(`${email}:${apiToken}`).toString('base64')
    const instructions = [
      'Context',
      'User Story',
      'Acceptance Criteria',
      'Definition of Done',
      'Implementation Guide',
      'Testing & QA Details',
      'Risk & Rollback',
      'Owner Notes (for Human Execution)'
    ]
    const brief = `\n\n---\n\nContext\n- Provide a 2-3 sentence problem statement.\n\nUser Story\n- As a <role>, I want <capability>, so that <benefit>.\n- Include primary personas and constraints.\n\nAcceptance Criteria\n- [ ] Criteria 1\n- [ ] Criteria 2\n- [ ] Criteria 3\n\nDefinition of Done\n- Code merged, tests passing, docs updated, feature toggles considered, metrics added if applicable.\n\nImplementation Guide\n- Pointers to code areas, endpoints, feature flags, migrations, and UI components.\n\nTesting & QA Details\n- Unit tests to add/update\n- Integration paths to validate\n- Manual QA steps (copy/paste commands or routes)\n\nRisk & Rollback\n- Note risks, fallback plan, and rollback steps.\n\nOwner Notes (for Human Execution)\n- Explicit instructions for PM/Owner to review scope, edge cases, and sign-off.\n`
    // Try to update description and add label; fall back to comment-only if edit fails
    const editUrl = `https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}`
    const addCommentUrl = `https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`
    // Fetch current fields (to avoid overwriting non-empty descriptions)
    let currentDesc = ''
    try {
      const r0 = await fetch(`${editUrl}?fields=summary,description,labels`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
      const j0: any = await r0.json().catch(()=>({}))
      currentDesc = String(j0?.fields?.description || '')
    } catch {}
    let okEdit = false
    try {
      // Legacy auto-brief disabled: do not overwrite description here
      okEdit = true
    } catch {}
    if (!okEdit) {
      // No-op fallback
    }
  }

  private async resolveAccountId(nameOrEmail: string, domain: string, basic: string): Promise<string|undefined> {
    try {
      // Try exact email lookup first
      if (nameOrEmail.includes('@')) {
        const rq = await fetch(`https://${domain}/rest/api/3/user/search?query=${encodeURIComponent(nameOrEmail)}`, { headers: { 'Authorization': `Basic ${basic}` } })
        const arr: any[] = await rq.json().catch(()=>[])
        return arr[0]?.accountId
      }
      // Name/handle lookup
      const r = await fetch(`https://${domain}/rest/api/3/user/search?query=${encodeURIComponent(nameOrEmail)}`, { headers: { 'Authorization': `Basic ${basic}` } })
      const users: any[] = await r.json().catch(()=>[])
      return users[0]?.accountId
    } catch { return undefined }
  }
}
