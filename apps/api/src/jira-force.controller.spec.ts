it('should throw ForbiddenException for unauthorized access', async () => {
    const user = { role: 'OrgEmployee' }; // Invalid role
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'], user } })).rejects.toThrow(ForbiddenException);
});