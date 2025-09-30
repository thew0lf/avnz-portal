  it('should throw BadRequestException for missing JIRA_DEFAULT_ORG_CODE', async () => {
    process.env.JIRA_DEFAULT_ORG_CODE = '';
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } } })).rejects.toThrow(BadRequestException);
  });