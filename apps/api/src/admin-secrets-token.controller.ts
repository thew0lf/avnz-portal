import { BadRequestException, Controller, Post, Req } from '@nestjs/common'
import { pool } from './db.js'
import { enc } from './crypto.util.js'

@Controller('admin')
export class AdminSecretsTokenController {
  @Post('services/configs/persist-jira-assignees')
  async persistJiraAssignees(@Req() req: any) {
    const token = String(req.headers['x-service-token'] || '')
    const expected = process.env.SERVICE_TOKEN || ''
    if (!expected || token !== expected) throw new BadRequestException('unauthorized')

    const orgCode = process.env.JIRA_DEFAULT_ORG_CODE || ''
    if (!orgCode) throw new BadRequestException('missing_org_code')
    const secret = process.env.AUTH_SECRET || 'dev-secret-change-me'

    const c = await pool.connect()
    try {
      const orgRow = await c.query('select id from organizations where lower(code)=lower($1) limit 1', [orgCode])
      const orgId: string | undefined = orgRow.rows[0]?.id
      if (!orgId) throw new BadRequestException('unknown_org')

      const map: Record<string, string> = {}
      // Resolve values from env (LIST takes precedence over singular)
      function pick(listKey: string, singleKey: string) {
        const v = process.env[listKey] || process.env[singleKey] || ''
        return String(v || '').trim()
      }
      map['assignee_dev'] = pick('JIRA_ASSIGNEE_DEV_LIST', 'JIRA_ASSIGNEE_DEV')
      map['assignee_review'] = pick('JIRA_ASSIGNEE_REVIEW_LIST', 'JIRA_ASSIGNEE_REVIEW')
      map['assignee_qa'] = pick('JIRA_ASSIGNEE_QA_LIST', 'JIRA_ASSIGNEE_QA')
      map['assignee_test'] = pick('JIRA_ASSIGNEE_TEST_LIST', 'JIRA_ASSIGNEE_TEST')
      map['assignee_audit'] = pick('JIRA_ASSIGNEE_AUDIT_LIST', 'JIRA_ASSIGNEE_AUDIT')
      map['assignment_exclude'] = String(process.env.JIRA_ASSIGNMENT_EXCLUDE || '').trim()
      const lb = String(process.env.JIRA_LOAD_BALANCE || '1').trim()
      map['load_balance'] = lb === '' ? '1' : (lb === 'true' ? '1' : (lb === 'false' ? '0' : lb))

      const entries = Object.entries(map).filter(([_, v]) => typeof v === 'string')
      if (entries.length === 0) return { ok: true, updated: 0, keys: [] }

      const updated: string[] = []
      for (const [name, value] of entries) {
        // Skip empty values to avoid overwriting with blanks
        if (!String(value || '').trim()) continue
        const value_enc = enc(value, secret) as any
        const r = await c.query(
          'insert into service_configs(id,org_id,client_id,service,name,value_enc) values (gen_random_uuid(),$1,null,$2,$3,$4) on conflict (org_id,client_id,service,name) do update set value_enc=excluded.value_enc, updated_at=now() returning id',
          [orgId, 'jira', name, value_enc]
        )
        if (r.rows[0]?.id) updated.push(name)
      }
      return { ok: true, updated: updated.length, keys: updated }
    } finally { c.release() }
  }
}

