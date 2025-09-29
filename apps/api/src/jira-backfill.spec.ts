it('should handle missing configuration gracefully', async () => {
    process.env.JIRA_DOMAIN = '';
    const result = await backfillInProgress();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('missing_config');
});