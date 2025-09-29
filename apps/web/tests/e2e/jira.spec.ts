test('CSV Format Response with empty results', async ({ request }) => {
    const response = await request.post('/jira/force-start?format=csv', {
        headers: {
            'x-service-token': validToken,
        },
        data: {
            keys: [], // Empty keys
        },
    });
    expect(response.headers()['content-type']).toBe('text/csv');
    expect(response.status()).toBe(200);
    expect(await response.text()).toBe(''); // Expect empty CSV
});

test('CSV Format Response with valid data', async ({ request }) => {
    const response = await request.post('/jira/force-start?format=csv', {
        headers: {
            'x-service-token': validToken,
        },
        data: {
            keys: validKeys,
        },
    });
    expect(response.headers()['content-type']).toBe('text/csv');
    expect(response.status()).toBe(200);
    const csvContent = await response.text();
    expect(csvContent).toContain('Expected Header'); // Replace with actual expected header
});