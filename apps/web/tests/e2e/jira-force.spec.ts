test('should throw BadRequestException for missing environment variables', async ({ page }) => {
    await page.evaluate(() => {
        process.env.JIRA_DOMAIN = '';
        process.env.JIRA_EMAIL = '';
        process.env.JIRA_API_TOKEN = '';
        process.env.JIRA_PROJECT_KEY = '';
        process.env.JIRA_DEFAULT_ORG_CODE = '';
    });

    const response = await page.request.post('/jira/forceStart', {
        data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } }
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('are required');
});