it('should throw BadRequestException for missing environment variables', async () => {
    const user = { role: 'OrgOwner' };
    process.env.JIRA_DOMAIN = '';
    process.env.JIRA_EMAIL = '';
    process.env.JIRA_API_TOKEN = '';
    process.env.JIRA_PROJECT_KEY = '';
    process.env.JIRA_DEFAULT_ORG_CODE = '';
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'], user } })).rejects.toThrow(BadRequestException);
});
