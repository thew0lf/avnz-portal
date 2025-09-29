  test('CSV Format Response', async ({ request }) => {
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
  });