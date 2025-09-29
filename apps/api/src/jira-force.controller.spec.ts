it('should throw BadRequestException for missing JIRA_PROJECT_KEY', async () => {
    process.env.JIRA_DOMAIN = 'test-domain';
    process.env.JIRA_EMAIL = 'test-email';
    process.env.JIRA_API_TOKEN = 'test-token';
    process.env.JIRA_PROJECT_KEY = '';
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] } })).rejects.toThrow(BadRequestException);
});

it('should throw BadRequestException for missing JIRA_DEFAULT_ORG_CODE', async () => {
    process.env.JIRA_DOMAIN = 'test-domain';
    process.env.JIRA_EMAIL = 'test-email';
    process.env.JIRA_API_TOKEN = 'test-token';
    process.env.JIRA_PROJECT_KEY = 'test-project';
    process.env.JIRA_DEFAULT_ORG_CODE = '';
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] } })).rejects.toThrow(BadRequestException);
});