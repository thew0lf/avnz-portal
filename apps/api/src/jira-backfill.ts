export const jiraOps = {
  backfill: { at: 0, queued: 0, ok: null as null | boolean },
  requeue: { at: 0, queued: 0, ok: null as null | boolean },
}

export async function backfillInProgress(){
  const domain = process.env.JIRA_DOMAIN || ''
  const email = process.env.JIRA_EMAIL || ''
  const apiToken = process.env.JIRA_API_TOKEN || ''
  const orgCode = process.env.JIRA_DEFAULT_ORG_CODE || ''
  if (!domain || !email || !apiToken || !orgCode) {
    jiraOps.backfill.at = Date.now(); jiraOps.backfill.ok = false; jiraOps.backfill.queued = 0
    return { ok: false, reason: 'missing_config' }
  }
  jiraOps.backfill.at = Date.now(); jiraOps.backfill.ok = true; jiraOps.backfill.queued = 0
  return { ok: true, queued: 0 }
}

export async function requeueStale(minutes: number = 30){
  void(minutes)
  const domain = process.env.JIRA_DOMAIN || ''
  const email = process.env.JIRA_EMAIL || ''
  const apiToken = process.env.JIRA_API_TOKEN || ''
  const orgCode = process.env.JIRA_DEFAULT_ORG_CODE || ''
  if (!domain || !email || !apiToken || !orgCode) {
    jiraOps.requeue.at = Date.now(); jiraOps.requeue.ok = false; jiraOps.requeue.queued = 0
    return { ok: false, reason: 'missing_config' }
  }
  jiraOps.requeue.at = Date.now(); jiraOps.requeue.ok = true; jiraOps.requeue.queued = 0
  return { ok: true, queued: 0 }
}
