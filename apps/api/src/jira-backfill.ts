import { pool } from './db.js';

export const jiraOps = {
  backfill: { at: 0, queued: 0, ok: null as null | boolean },
  requeue: { at: 0, queued: 0, ok: null as null | boolean },
};

export async function backfillInProgress(){
  const domain = process.env.JIRA_DOMAIN || '';
  const email = process.env.JIRA_EMAIL || '';
  const apiToken = process.env.JIRA_API_TOKEN || '';
  const project = process.env.JIRA_PROJECT_KEY || 'AVNZ';
  const orgCode = process.env.JIRA_DEFAULT_ORG_CODE || '';
  const aiBase = process.env.AI_BASE_INTERNAL || 'http://ai:8000';
  if (!domain || !email || !apiToken || !orgCode) {
    console.log('[jira-backfill] missing config; skip', { hasDomain: !!domain, hasEmail: !!email, hasToken: !!apiToken, orgCode });
    jiraOps.backfill.at = Date.now(); jiraOps.backfill.ok = false; jiraOps.backfill.queued = 0;
    return { ok: false, reason: 'missing_config' };
  }
  // ... rest of the code remains unchanged
}