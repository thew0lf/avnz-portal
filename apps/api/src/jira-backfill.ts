import { pool } from './db.js'

export const jiraOps = {
  backfill: { at: 0, queued: 0, ok: null as null | boolean },
  requeue: { at: 0, queued: 0, ok: null as null | boolean },
}

export async function backfillInProgress(){
  const domain = process.env.JIRA_DOMAIN || ''
  const email = process.env.JIRA_EMAIL || ''
  const apiToken = process.env.JIRA_API_TOKEN || ''
  const project = process.env.JIRA_PROJECT_KEY || 'AVNZ'
  const orgCode = process.env.JIRA_DEFAULT_ORG_CODE || ''
  const aiBase = process.env.AI_BASE_INTERNAL || 'http://ai:8000'
  if (!domain || !email || !apiToken || !orgCode) {
    console.log('[jira-backfill] missing config; skip', { hasDomain: !!domain, hasEmail: !!email, hasToken: !!apiToken, orgCode })
    jiraOps.backfill.at = Date.now(); jiraOps.backfill.ok = false; jiraOps.backfill.queued = 0
    return { ok: false, reason: 'missing_config' }
  }
  const basic = Buffer.from(`${email}:${apiToken}`).toString('base64')
  const jql = encodeURIComponent(`project = ${project} AND status = "In Progress" ORDER BY updated DESC`)
  let startAt = 0
  const maxResults = 50
  const c = await pool.connect()
  try {
    const org = await c.query('select id from organizations where lower(code)=lower($1) limit 1', [orgCode])
    const orgId: string | undefined = org.rows[0]?.id
    if (!orgId) { console.log('[jira-backfill] unknown orgCode', orgCode); return { ok:false, reason:'unknown_org' } }
    let total = 0, queued = 0, failed: Array<{ key:string, status?:number }> = []
    while (true) {
      const url = `https://${domain}/rest/api/3/search?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}&fields=summary,description,status`
      const r = await fetch(url, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
      if (!r.ok) { console.log('[jira-backfill] jira search failed', r.status); break }
      const data: any = await r.json().catch(()=>({ issues: [] }))
      const issues: any[] = data.issues || []
      if (issues.length === 0) break
      for (const is of issues) {
        const key = is.key
        total++
        const fields = is.fields || {}
        const exists = await c.query('select 1 from jira_jobs where org_id=$1 and issue_key=$2 and deleted_at is null limit 1', [orgId, key])
        if (exists.rows.length > 0) continue
        const summary = String(fields.summary || '')
        const description = String(fields.description || '')
        const body = JSON.stringify({ task: `[Jira ${key}] ${summary}\n\n${description}`, meta: { org_id: orgId, jira_issue_key: key } })
        try {
          const rr = await fetch(`${aiBase}/agents/jobs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
          const jj: any = await rr.json().catch(()=>({}))
          const jobId = jj.job_id || jj.id || null
          if (jobId) {
            await c.query('insert into jira_jobs(org_id, issue_key, job_id, status) values ($1,$2,$3,$4)', [orgId, key, jobId, 'queued'])
            console.log('[jira-backfill] queued', key, jobId)
            queued++
          } else {
            console.log('[jira-backfill] failed to queue', key, rr.status)
            failed.push({ key, status: rr.status })
          }
        } catch (e) {
          console.log('[jira-backfill] queue failed', key, e)
          failed.push({ key })
        }
      }
      startAt += issues.length
      if (startAt >= (data.total || 0)) break
    }
    jiraOps.backfill.at = Date.now(); jiraOps.backfill.ok = true; jiraOps.backfill.queued = queued
    return { ok: true, total, queued, failed }
  } finally { c.release() }
}

export async function requeueStale(minutes: number = 30){
  const domain = process.env.JIRA_DOMAIN || ''
  const email = process.env.JIRA_EMAIL || ''
  const apiToken = process.env.JIRA_API_TOKEN || ''
  const project = process.env.JIRA_PROJECT_KEY || 'AVNZ'
  const orgCode = process.env.JIRA_DEFAULT_ORG_CODE || ''
  const aiBase = process.env.AI_BASE_INTERNAL || 'http://ai:8000'
  if (!domain || !email || !apiToken || !orgCode) {
    console.log('[jira-requeue-stale] missing config; skip', { hasDomain: !!domain, hasEmail: !!email, hasToken: !!apiToken, orgCode })
    jiraOps.requeue.at = Date.now(); jiraOps.requeue.ok = false; jiraOps.requeue.queued = 0
    return { ok: false, reason: 'missing_config' }
  }
  const basic = Buffer.from(`${email}:${apiToken}`).toString('base64')
  const jql = encodeURIComponent(`project = ${project} AND statusCategory != Done AND updated <= -${Math.max(5, minutes)}m ORDER BY updated DESC`)
  const c = await pool.connect()
  try {
    const org = await c.query('select id from organizations where lower(code)=lower($1) limit 1', [orgCode])
    const orgId: string | undefined = org.rows[0]?.id
    if (!orgId) { console.log('[jira-requeue-stale] unknown orgCode', orgCode); return { ok:false, reason:'unknown_org' } }
    const url = `https://${domain}/rest/api/3/search?jql=${jql}&maxResults=100&fields=summary,status,updated,assignee`
    const r = await fetch(url, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
    if (!r.ok) { console.log('[jira-requeue-stale] jira search failed', r.status); jiraOps.requeue.at = Date.now(); jiraOps.requeue.ok = false; jiraOps.requeue.queued = 0; return { ok:false, reason:'jira_search_failed', status: r.status } }
    const data: any = await r.json().catch(()=>({ issues: [] }))
    let queued = 0
    for (const it of (data.issues||[])){
      const key = it.key
      const statusName = String(it.fields?.status?.name||'').toLowerCase()
      let phase = ''
      if (statusName === 'in progress' || statusName === 'blocked') phase = 'dev'
      else if (statusName === 'in review') phase = 'review'
      else if (statusName === 'qa testing' || statusName === 'qa') phase = 'qa'
      if (!phase) continue
      const exists = await c.query('select 1 from jira_jobs where org_id=$1 and issue_key=$2 and deleted_at is null limit 1', [orgId, key])
      if (exists.rows.length > 0) continue
      const summary = String(it.fields?.summary||'')
      const taskText = `[${phase.toUpperCase()} Jira ${key}] Re-run phase ${phase} for stale issue ${key}.\n\n${summary}`
      const body = JSON.stringify({ task: taskText, meta: { org_id: orgId, jira_issue_key: key, phase } })
      try {
        const rr = await fetch(`${aiBase}/agents/jobs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
        const jj: any = await rr.json().catch(()=>({}))
        const jobId = jj.job_id || jj.id || null
        if (jobId) { await c.query('insert into jira_jobs(org_id, issue_key, job_id, status) values ($1,$2,$3,$4)', [orgId, key, jobId, 'queued']); queued++ }
      } catch {}
    }
    jiraOps.requeue.at = Date.now(); jiraOps.requeue.ok = true; jiraOps.requeue.queued = queued
    return { ok: true, queued }
  } finally { c.release() }
}
