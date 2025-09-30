import { BadRequestException, Controller, Post, Req } from '@nestjs/common'

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
    const keys: string[] = Array.isArray(body.keys) ? body.keys : []
    if (!keys.length) throw new BadRequestException('missing keys')

    const rawList = String(process.env.JIRA_ASSIGNEE_DEV_LIST || process.env.JIRA_ASSIGNEE_DEV || '')
    const exclude = new Set(String(process.env.JIRA_ASSIGNMENT_EXCLUDE || 'Bill Cuevas').split(/[;,\n]+/).map(s=>s.trim().toLowerCase()).filter(Boolean))
    const names = rawList
      .split(/[;,\n]+/)
      .map(s=> s.split('|')[0].trim())
      .filter(Boolean)
      .filter(n => !exclude.has(n.toLowerCase()))
    if (names.length === 0) throw new BadRequestException('no_assignees_configured')

    const basic = Buffer.from(`${email}:${apiToken}`).toString('base64')
    let idx = 0
    const results: any[] = []
    for (const key of keys){
      const name = names[idx % names.length]; idx++
      try {
        const q = encodeURIComponent(name)
        const uRes = await fetch(`https://${domain}/rest/api/3/user/search?query=${q}`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
        const arr: any[] = await uRes.json().catch(()=>[])
        const acct = arr?.[0]?.accountId || ''
        if (!acct) { results.push({ key, error: 'no_account' }); continue }
        const aRes = await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(key)}/assignee`, { method:'PUT', headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: acct }) })
        results.push({ key, name, http: aRes.status })
      } catch (e) { results.push({ key, error: 'exception' }) }
    }
    return { ok: true, results }
  }
}

