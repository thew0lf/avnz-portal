it('should handle missing configuration gracefully', async () => {
    process.env.JIRA_DOMAIN = '';
    process.env.JIRA_EMAIL = '';
    process.env.JIRA_API_TOKEN = '';
    const result = await backfillInProgress();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('missing_config');
});