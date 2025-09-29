import { BadRequestException, Controller, Post, Req } from '@nestjs/common'
import { pool } from './db.js'

@Controller('jira')
export class JiraForceController {
  @Post('force-start')
  async forceStart(@Req() req: any){
    const token = String(req.headers['x-service-token'] || '')
    const expected = process.env.SERVICE_TOKEN || ''
    if (!expected || token !== expected) throw new BadRequestException('unauthorized')
    const body = req.body || {}
    const keys: string[] = Array.isArray(body.keys) ? body.keys : []
    if (!keys.length) throw new BadRequestException('missing keys')
    const domain = process.env.JIRA_DOMAIN || ''
    const email = process.env.JIRA_EMAIL || ''
    const apiToken = process.env.JIRA_API_TOKEN || ''
    const orgCode = process.env.JIRA_DEFAULT_ORG_CODE || ''
    if (!domain || !email || !apiToken || !orgCode) throw new BadRequestException('missing_jira_env')
    const basic = Buffer.from(`${email}:${apiToken}`).toString('base64')
    const aiBase = process.env.AI_BASE_INTERNAL || 'http://ai:8000'
    const c = await pool.connect()
    try {
      const orgRow = await c.query('select id from organizations where lower(code)=lower($1) limit 1', [orgCode])
      const orgId: string | undefined = orgRow.rows[0]?.id
      if (!orgId) throw new BadRequestException('unknown_org')
      let updatedDesc = 0, moved = 0, queued = 0
      const results: any[] = []
      for (const key of keys) {
        const issueKey = String(key || '')
        const infoRes = await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary,description`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
        if (!infoRes.ok) { results.push({ key, error: `fetch_info_${infoRes.status}` }); continue }
        const info: any = await infoRes.json().catch(()=>({}))
        const fields = info?.fields || {}
        const summary = String(fields.summary || '')
        const desc = fields.description
        const text = typeof desc === 'string' ? desc : JSON.stringify(desc || {})
        const hasSections = !!(text && text.includes('Context') && text.includes('User Story') && text.includes('Acceptance Criteria') && text.includes('Testing & QA'))
        if (!hasSections) {
          const adf = {
            type: 'doc', version: 1, content: [
              { type:'heading', attrs:{ level:3 }, content:[{ type:'text', text:'Context' }]},
              { type:'paragraph', content:[{ type:'text', text:`Implement ${issueKey} per repo conventions (RBAC, soft-delete, SPA forms).` }]},
              { type:'heading', attrs:{ level:3 }, content:[{ type:'text', text:'User Story' }]},
              { type:'paragraph', content:[{ type:'text', text:'As a developer, I want to implement this ticket according to project standards so that the feature integrates safely and predictably.' }]},
              { type:'heading', attrs:{ level:3 }, content:[{ type:'text', text:'Acceptance Criteria' }]},
              { type:'bulletList', content:[
                { type:'listItem', content:[{ type:'paragraph', content:[{ type:'text', text:'Code compiles and lints pass; tests added and passing' }]}]},
                { type:'listItem', content:[{ type:'paragraph', content:[{ type:'text', text:'SUMMARY.MD updated' }]}]}
              ]},
              { type:'heading', attrs:{ level:3 }, content:[{ type:'text', text:'Testing & QA' }]},
              { type:'bulletList', content:[
                { type:'listItem', content:[{ type:'paragraph', content:[{ type:'text', text:'Unit tests for API/Web; QA Playwright spec for user flow' }]}]}
              ]}
            ]
          }
          await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}`, { method:'PUT', headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { description: adf } }) })
          updatedDesc++
        }
        // Transition to In Progress if possible
        try {
          const tRes = await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
          const tJson: any = await tRes.json().catch(()=>({ transitions: [] }))
          const trans = (tJson.transitions||[]).find((x:any)=> String(x.name||'').toLowerCase()==='in progress')
          if (trans?.id) {
            await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, { method: 'POST', headers: { 'Authorization': `Basic ${basic}`, 'Content-Type':'application/json' }, body: JSON.stringify({ transition: { id: trans.id } }) })
            moved++
          }
        } catch {}
        // Enqueue Dev job
        try {
          const taskText = `[Jira ${issueKey}] ${summary || 'No summary'}`
          const body = JSON.stringify({ task: taskText, meta: { org_id: orgId, jira_issue_key: issueKey, phase: 'dev' } })
          const rr = await fetch(`${aiBase}/agents/jobs`, { method:'POST', headers:{ 'content-type':'application/json' }, body })
          const jj: any = await rr.json().catch(()=>({}))
          const jobId = jj.job_id || jj.id || null
          if (jobId) {
            await c.query('insert into jira_jobs(org_id, issue_key, job_id, status) values ($1,$2,$3,$4)', [orgId, issueKey, jobId, 'queued'])
            queued++
          }
        } catch {}
        results.push({ key, updatedDesc: hasSections? false: true, moved: true, queued: true })
      }
      return { ok: true, updatedDesc, moved, queued, results }
    } finally { c.release() }
  }
}

