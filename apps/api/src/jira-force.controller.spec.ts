it('should throw BadRequestException for missing JIRA_DOMAIN', async () => {
    process.env.JIRA_DOMAIN = '';
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] } })).rejects.toThrow(BadRequestException);
});

it('should throw ForbiddenException for unauthorized access', async () => {
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] }, headers: { authorization: '' } })).rejects.toThrow(ForbiddenException);
});