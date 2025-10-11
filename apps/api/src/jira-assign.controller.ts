import { BadRequestException, Controller, Post, Req } from '@nestjs/common';
import { pool } from './db.js';

@Controller('jira')
export class JiraAssignController {
  @Post('assign-dev')
  async assignDev(@Req() req: any){
    const debug = String(process.env.JIRA_ASSIGN_DEBUG || '') === '1'
    const log = (...args:any[]) => { if (debug) { try { console.log('[jira-assign]', ...args) } catch {} } }
    const token = String(req.headers['x-service-token'] || '');
    const expected = process.env.SERVICE_TOKEN || '';
    if (!expected || token !== expected) throw new BadRequestException('unauthorized');

    const domain = process.env.JIRA_DOMAIN || '';
    const email = process.env.JIRA_EMAIL || '';
    const apiToken = process.env.JIRA_API_TOKEN || '';
    if (!domain || !email || !apiToken) throw new BadRequestException('missing_jira_env');
    const body = req.body || {};
    let keys: string[] = Array.isArray(body.keys) ? body.keys : [];
    const target = String((req.query?.target || body.target || '') || '').toLowerCase();
    const project = process.env.JIRA_PROJECT_KEY || 'AVNZ';
    const basic = Buffer.from(`${email}:${apiToken}`).toString('base64');

    // If no keys provided and target=cto, fetch issues assigned to CTO
    if ((!keys || keys.length === 0) && (target === 'cto')) {
      const ctoName = process.env.JIRA_CTO_NAME || 'Bill Cuevas';
      try {
        const q = encodeURIComponent(ctoName);
        const uRes = await fetch(`https://${domain}/rest/api/3/user/search?query=${q}`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } });
        const arr: any[] = await uRes.json().catch(()=>[]);
        const acct = arr?.[0]?.accountId || '';
        if (acct) {
          const jql = encodeURIComponent(`project = ${project} AND assignee = accountId("${acct}") AND statusCategory != Done`);
          const sr = await fetch(`https://${domain}/rest/api/3/search?jql=${jql}&maxResults=100&fields=key`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } });
          const data: any = await sr.json().catch(()=>({ issues: [] }));
          keys = (data.issues || []).map((it:any)=> it.key).filter(Boolean);
        }
      } catch {}
      if (!keys || keys.length === 0) return { ok:false, error:'no_cto_issues_found' };
    }
    // If no keys and target=org-managers, collect all issues currently assigned to org managers (prefer full name; fallback to email)
    if ((!keys || keys.length === 0) && (target === 'org-managers')) {
      const qOrgId = String((req.query?.orgId || '') as any).trim()
      const qOrgCode = String((req.query?.orgCode || '') as any).trim()
      const envOrgCode = String(process.env.JIRA_DEFAULT_ORG_CODE || '')
      const c = await pool.connect();
      try {
        let orgId: string | undefined = undefined
        if (qOrgId && /[0-9a-fA-F-]{8,}/.test(qOrgId)) {
          orgId = qOrgId
        } else if (qOrgCode) {
          const or1 = await c.query('select id from organizations where lower(code)=lower($1) limit 1', [qOrgCode]);
          orgId = or1.rows[0]?.id
        } else if (envOrgCode) {
          const or2 = await c.query('select id from organizations where lower(code)=lower($1) limit 1', [envOrgCode]);
          orgId = or2.rows[0]?.id
        }
        if (!orgId) throw new BadRequestException('unknown_org');
        const mr = await c.query(
          "select coalesce(up.first_name,'') as first_name, coalesce(up.last_name,'') as last_name, u.email from memberships m join users u on u.id=m.user_id left join user_profiles up on up.user_id=u.id where m.org_id=$1 and m.role=$2",
          [orgId, 'org']
        );
        const acctIds: string[] = []
        for (const r of (mr.rows||[])){
          const full = `${r.first_name} ${r.last_name}`.trim()
          const emailCandidate = String(r.email||'').trim()
          let acct: string | null = null
          if (full){
            try {
              const uRes = await fetch(`https://${domain}/rest/api/3/user/search?query=${encodeURIComponent(full)}`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } });
              const arr: any[] = await uRes.json().catch(()=>[]);
              acct = arr?.[0]?.accountId || null
            } catch {}
          }
          if (!acct && emailCandidate){
            try {
              const uRes2 = await fetch(`https://${domain}/rest/api/3/user/search?query=${encodeURIComponent(emailCandidate)}`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } });
              const arr2: any[] = await uRes2.json().catch(()=>[]);
              acct = arr2?.[0]?.accountId || null
            } catch {}
          }
          if (acct) acctIds.push(acct)
        }
        log('org-managers: accounts', { count: acctIds.length })
        const keySet = new Set<string>()
        for (const acct of acctIds){
          try {
            const jql = encodeURIComponent(`project = ${project} AND assignee = accountId(\"${acct}\") AND statusCategory != Done`)
            const sr = await fetch(`https://${domain}/rest/api/3/search?jql=${jql}&maxResults=100&fields=key`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
            const data: any = await sr.json().catch(()=>({ issues: [] }))
            for (const it of (data.issues||[])) { if (it?.key) keySet.add(String(it.key)) }
          } catch {}
        }
        keys = Array.from(keySet)
        log('org-managers: discovered keys', { count: keys.length })
      } finally {
        c.release();
      }
      // Deduplicate collected keys
      if (keys && keys.length) { keys = Array.from(new Set(keys)) }
    }
    // If no keys and target=exclude, sweep issues assigned to excluded names (e.g., Bill Cuevas)
    if ((!keys || keys.length === 0) && (target === 'exclude')) {
      const qOrgId = String((req.query?.orgId || '') as any).trim()
      const qOrgCode = String((req.query?.orgCode || '') as any).trim()
      const envOrgCode = String(process.env.JIRA_DEFAULT_ORG_CODE || '')
      const c = await pool.connect()
      try {
        let orgId: string | undefined = undefined
        if (qOrgId && /[0-9a-fA-F-]{8,}/.test(qOrgId)) {
          orgId = qOrgId
        } else if (qOrgCode) {
          const or1 = await c.query('select id from organizations where lower(code)=lower($1) limit 1', [qOrgCode])
          orgId = or1.rows[0]?.id
        } else if (envOrgCode) {
          const or2 = await c.query('select id from organizations where lower(code)=lower($1) limit 1', [envOrgCode])
          orgId = or2.rows[0]?.id
        }
        if (!orgId) throw new BadRequestException('unknown_org')
        // Build exclude list from env and default Bill Cuevas
        const excludeNames = String(process.env.JIRA_ASSIGNMENT_EXCLUDE || '')
          .split(/[;,\n]+/)
          .map(s=> s.trim())
          .filter(Boolean)
        if (!excludeNames.find(n => n.toLowerCase() === 'bill cuevas')) excludeNames.push('Bill Cuevas')
        log('exclude: names', excludeNames)
        // Resolve accounts for excluded names
        const acctIds: string[] = []
        for (const name of excludeNames){
          try {
            const r = await fetch(`https://${domain}/rest/api/3/user/search?query=${encodeURIComponent(name)}`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
            const arr: any[] = await r.json().catch(()=>[])
            const acct = arr?.[0]?.accountId || ''
            if (acct && !acctIds.includes(acct)) acctIds.push(acct)
          } catch {}
        }
        log('exclude: accounts', { count: acctIds.length })
        // Gather all non-done issues assigned to those accounts
        const keySet = new Set<string>()
        for (const acct of acctIds){
          try {
            const jql = encodeURIComponent(`assignee = accountId(\"${acct}\") AND statusCategory != Done`)
            const sr = await fetch(`https://${domain}/rest/api/3/search?jql=${jql}&maxResults=100&fields=key`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } })
            const data: any = await sr.json().catch(()=>({ issues: [] }))
            for (const it of (data.issues||[])) { if (it?.key) keySet.add(String(it.key)) }
          } catch {}
        }
        keys = Array.from(keySet)
        log('exclude: discovered keys', { count: keys.length })
      } finally { c.release() }
      if (keys && keys.length) { keys = Array.from(new Set(keys)) }
    }
    if (!keys.length) {
      if (target === 'org-managers') return { ok:false, error:'no_org_manager_issues_found' }
      throw new BadRequestException('missing keys')
    }

    // Build candidate names and exclusions
    const rawList = String(process.env.JIRA_ASSIGNEE_DEV_LIST || process.env.JIRA_ASSIGNEE_DEV || '');
    const exclude = new Set(String(process.env.JIRA_ASSIGNMENT_EXCLUDE || '').split(/[;,\n]+/).map(s=>s.trim().toLowerCase()).filter(Boolean));
    exclude.add('bill cuevas');
    const names = rawList
      .split(/[;,\n]+/)
      .map(s=> s.split('|')[0].trim())
      .filter(Boolean)
      .filter(n => !exclude.has(n.toLowerCase()));
    if (names.length === 0) return { ok:false, error:'no_assignees_configured_after_exclude' };

    let idx = 0;
    const results: any[] = [];
    let assigned = 0, skipped_no_account = 0, failed_http = 0
    for (const key of keys){
      const name = names[idx % names.length]; idx++;
      try {
        const q = encodeURIComponent(name);
        const uRes = await fetch(`https://${domain}/rest/api/3/user/search?query=${q}`, { headers: { 'Authorization': `Basic ${basic}`, 'Accept': 'application/json' } });
        const arr: any[] = await uRes.json().catch(()=>[]);
        const acct = arr?.[0]?.accountId || '';
        if (!acct) { results.push({ key, name, error: 'no_account' }); skipped_no_account++; continue }
        const aRes = await fetch(`https://${domain}/rest/api/3/issue/${encodeURIComponent(key)}/assignee`, { method:'PUT', headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: acct }) });
        if (aRes.status === 204) assigned++; else failed_http++
        results.push({ key, name, http: aRes.status });
        log('assign', { key, to: name, http: aRes.status })
      } catch {
        results.push({ key, name, error: 'exception' });
        failed_http++
        log('assign-error', { key, to: name })
      }
    }
    return { ok: true, attempted: keys.length, assigned, skipped_no_account, failed_http, results };
  }
}
