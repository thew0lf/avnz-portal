it('should throw ForbiddenException for invalid user role', async () => {
    const user = { role: 'InvalidRole' };
    process.env.JIRA_DOMAIN = 'test-domain';
    process.env.JIRA_EMAIL = 'test-email';
    process.env.JIRA_API_TOKEN = 'test-token';
    process.env.JIRA_PROJECT_KEY = 'test-project';
    process.env.JIRA_DEFAULT_ORG_CODE = 'test-org-code';
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'], user } })).rejects.toThrow(ForbiddenException);
});