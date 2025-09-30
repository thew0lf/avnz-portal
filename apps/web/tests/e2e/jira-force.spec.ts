test('should throw ForbiddenException for invalid user role', async ({ request }) => {
    const response = await request.post('/jira/forceStart', {
        data: { keys: ['AVNZ-1'], user: { role: 'InvalidRole' } }
    });

    expect(response.status()).toBe(403);
    const responseBody = await response.json();
    expect(responseBody.message).toBe('You do not have permission to access this resource.');
});
