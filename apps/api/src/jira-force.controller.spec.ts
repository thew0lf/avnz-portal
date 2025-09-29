it('should throw BadRequestException for missing JIRA_DOMAIN', async () => {
    process.env.JIRA_DOMAIN = '';
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] } })).rejects.toThrow(BadRequestException);
});

it('should throw ForbiddenException for unauthorized access', async () => {
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] }, headers: { authorization: '' } })).rejects.toThrow(ForbiddenException);
});

it('should handle multiple fetch calls efficiently', async () => {
    process.env.JIRA_DOMAIN = 'test-domain';
    process.env.JIRA_EMAIL = 'test-email';
    process.env.JIRA_API_TOKEN = 'test-token';
    const result = await controller.forceStart({ body: { keys: ['AVNZ-1', 'AVNZ-2'] }, headers: { authorization: 'Bearer token' } });
    expect(result).toBeDefined();
});
