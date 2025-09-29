it('should throw BadRequestException for missing JIRA_EMAIL', async () => {
    process.env.JIRA_EMAIL = '';
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] } })).rejects.toThrow(BadRequestException);
});

it('should throw BadRequestException for missing JIRA_API_TOKEN', async () => {
    process.env.JIRA_API_TOKEN = '';
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] } })).rejects.toThrow(BadRequestException);
});