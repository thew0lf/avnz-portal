test('should throw BadRequestException for missing JIRA_DOMAIN', async ({ request }) => {
    process.env.JIRA_DOMAIN = '';
    const response = await request.post('/jira/forceStart', { data: { keys: ['PROJECT-123'] } });
    expect(response.status()).toBe(500);
    const responseBody = await response.json();
    expect(responseBody.ok).toBe(false);
    expect(responseBody.reason).toBe('missing_config');
});

// Ensure to restore JIRA_DOMAIN after the test
process.env.JIRA_DOMAIN = 'your_original_domain_here'; // Replace with the actual original value