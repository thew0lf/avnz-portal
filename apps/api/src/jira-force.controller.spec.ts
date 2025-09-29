it('should throw BadRequestException for missing JIRA_DOMAIN', async () => {
    process.env.JIRA_DOMAIN = '';
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] } })).rejects.toThrow(BadRequestException);
});

it('should throw ForbiddenException for unauthorized access', async () => {
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] }, headers: { authorization: '' } })).rejects.toThrow(ForbiddenException);
});

it('should throw BadRequestException for invalid issue key format', async () => {
    process.env.JIRA_DOMAIN = 'valid.domain.com';
    await expect(controller.forceStart({ body: { keys: ['INVALID_KEY'] } })).rejects.toThrow(BadRequestException);
});

it('should return results for valid keys', async () => {
    process.env.JIRA_DOMAIN = 'valid.domain.com';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_API_TOKEN = 'valid_token';
    const result = await controller.forceStart({ body: { keys: ['AVNZ-1'] }, headers: { authorization: 'Bearer token' } });
    expect(result).toBeDefined();
});