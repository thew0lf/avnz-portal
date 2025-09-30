test('should throw ForbiddenException for invalid user role', async ({ page }) => {
    await page.evaluate(() => {
        process.env.JIRA_DOMAIN = 'test-domain';
        process.env.JIRA_EMAIL = 'test-email';
        process.env.JIRA_API_TOKEN = 'test-token';
        process.env.JIRA_PROJECT_KEY = 'test-project';
        process.env.JIRA_DEFAULT_ORG_CODE = 'test-org-code';
    });

    const response = await page.request.post('/jira/forceStart', {
        data: { keys: ['AVNZ-1'], user: { role: 'OrgEmployee' } }
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.message).toContain('ForbiddenException');
});