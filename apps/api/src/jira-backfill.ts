export async function backfillInProgress() {
  const domain = process.env.JIRA_DOMAIN || '';
  const email = process.env.JIRA_EMAIL || '';
  const apiToken = process.env.JIRA_API_TOKEN || '';
  const project = process.env.JIRA_PROJECT_KEY || '';
  const orgCode = process.env.JIRA_DEFAULT_ORG_CODE || '';
  const aiBase = process.env.AI_BASE_INTERNAL || 'http://ai:8000';
  if (!domain || !email || !apiToken || !orgCode) {
    console.log('[jira-backfill] missing config; skip', { hasDomain: !!domain, hasEmail: !!email, hasToken: !!apiToken, orgCode });
    return { ok: false, reason: 'missing_config' };
  }
  // Enhanced error handling
  try {
    // existing logic
  } catch (error) {
    console.error('Error in backfillInProgress:', error);
    return { ok: false, reason: 'internal_error' };
  }
}