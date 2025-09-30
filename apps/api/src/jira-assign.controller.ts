import { BadRequestException, Controller, Post, Req } from '@nestjs/common'
import { pool } from './db.js'

@Controller('jira')
export class JiraAssignController {
  @Post('assign-dev')
  async assignDev(@Req() req: any){
    const token = String(req.headers['x-service-token'] || '')
    const expected = process.env.SERVICE_TOKEN || ''
    if (!expected || token !== expected) throw new BadRequestException('unauthorized')

    const domain = process.env.JIRA_DOMAIN || ''
    const email = process.env.JIRA_EMAIL || ''
    const apiToken = process.env.JIRA_API_TOKEN || ''
    if (!domain || !email || !apiToken) throw new BadRequestException('missing_jira_env')
    const body = req.body || {}
    let keys: string[] = Array.isArray(body.keys) ? body.keys : []
    const target = String((req.query?.target || body.target || '') || '').toLowerCase()
    const project = process.env.JIRA_PROJECT_KEY || 'AVNZ'
    const basic = Buffer.from(`${email}:${apiToken}`).toString('base64')

    // If no keys provided and target=cto, fetch issues assigned to CTO
    if ((!keys || keys.length === 0) && (target === 'cto')) {
      const ctoName = process.env.JIRA_CTO_NAME || 'Bill Cuevas'
      try {
        const q = encodeURIComponent(ctoName)
        const uRes = await fetch(`https://${domain}/rest/api/3/user/search?query=${q}`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
        const arr: any[] = await uRes.json().catch(()=>[])
        const acct = arr?.[0]?.accountId || ''
        if (acct) {
          const jql = encodeURIComponent(`project = ${project} AND assignee = accountId("${acct}") AND statusCategory != Done`)
          const sr = await fetch(`https://${domain}/rest/api/3/search?jql=${jql}&maxResults=100&fields=key`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
          const data: any = await sr.json().catch(()=>({ issues: [] }))
          keys = (data.issues || []).map((it:any)=> it.key).filter(Boolean)
        }
      } catch {}
      if (!keys || keys.length === 0) return { ok:false, error:'no_cto_issues_found' }
    }
    // If no keys and target=org-managers, collect all issues currently assigned to org managers (with first+last name set)
    if ((!keys || keys.length === 0) && (target === 'org-managers')) {
      const orgCode = process.env.JIRA_DEFAULT_ORG_CODE || ''
      if (!orgCode) throw new BadRequestException('missing_org_code')
      const c = await pool.connect()
      try {
        const or = await c.query('select id from organizations where lower(code)=lower($1) limit 1', [orgCode])
        const orgId: string | undefined = or.rows[0]?.id
        if (!orgId) throw new BadRequestException('unknown_org')
        const mr = await c.query(
          'select up.first_name, up.last_name from memberships m join users u on u.id=m.user_id left join user_profiles up on up.user_id=u.id where m.org_id=$1 and m.role=$2 and coalesce(up.first_name, \'') <> \'\' and coalesce(up.last_name, \'') <> \'\'',
          [orgId, 'org']
        )
        const names: string[] = (mr.rows || []).map((r:any)=> `${r.first_name} ${r.last_name}`.trim()).filter(Boolean)
        const acctIds: string[] = []
        for (const name of names){
          try {
            const q = encodeURIComponent(name)
            const uRes = await fetch(`https://${domain}/rest/api/3/user/search?query=${q}`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
            const arr: any[] = await uRes.json().catch(()=>[])
            const acct = arr?.[0]?.accountId || ''
            if (acct) acctIds.push(acct)
          } catch {}
        }
        const keySet = new Set<string>()
        for (const acct of acctIds){
          try {
            const jql = encodeURIComponent(`project = ${project} AND assignee = accountId("${acct}") AND statusCategory != Done`)
            const sr = await fetch(`https://${domain}/rest/api/3/search?jql=${jql}&maxResults=100&fields=key`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
            const data: any = await sr.json().catch(()=>({ issues: [] }))
            for (const it of (data.issues||[])) { if (it?.key) keySet.add(String(it.key)) }
          } catch {}
        }
        keys = Array.from(keySet)
      } finally { c.release() }
      if (!keys || keys.length === 0) return { ok:false, error:'no_org_manager_issues_found' }
    }
    if (!keys || keys.length === 0) throw new BadRequestException('missing keys')

    // Build candidate names and exclusion
    const rawList = String(process.env.JIRA_ASSIGNEE_DEV_LIST || process.env.JIRA_ASSIGNEE_DEV || '')
    const exclude = new Set(String(process.env.JIRA_ASSIGNMENT_EXCLUDE || '').split(/[;,\n]+/).map(s=>s.trim().toLowerCase()).filter(Boolean))
    exclude.add('bill cuevas')
    const names = rawList
      .split(/[;,\n]+/)
      .map(s=> s.split('|')[0].trim())
      .filter(Boolean)
      .filter(n => !exclude.has(n.toLowerCase()))
    if (names.length === 0) return { ok:false, error:'no_assignees_configured_after_exclude' }

    let idx = 0
    const results: any[] = []
    for (const key of keys){
      const name = names[idx % names.length]; idx++
      try {
        const q = encodeURIComponent(name)
        const uRes = await fetch(`https://${domain}/rest/api/3/user/search?query=${q}`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
        const arr: any[] = await uRes.json().catch(()=>[])
        const acct = arr?.[0]?.accountId || ''
        if (!acct) { results.push({ key, name, error: 'no_account' }); continue }
        const aRes = await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(key)}/assignee`, { method:'PUT', headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: acct }) })
        results.push({ key, name, http: aRes.status })
      } catch {
        results.push({ key, name, error: 'exception' })
      }
    }
    return { ok: true, results }
  }
}
