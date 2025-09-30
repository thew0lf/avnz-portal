test('should allow access for valid user roles', async ({ page }) => {
    const response = await page.request.post('/jira/forceStart', {
        data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } }
    });
    expect(response.status()).toBe(200);
});

// Additional test for invalid role

test('should throw ForbiddenException for invalid user role', async ({ page }) => {
    const response = await page.request.post('/jira/forceStart', {
        data: { keys: ['AVNZ-1'], user: { role: 'InvalidRole' } }
    });
    expect(response.status()).toBe(403);
});