it('should return empty CSV when results are empty', async () => {
    const req = { query: { format: 'csv' }, body: { keys: [] } }; // Empty keys
    const result = await controller.forceStart(req);
    expect(result.headers['Content-Type']).toBe('text/csv');
    expect(result.body).toBe(''); // Expect empty CSV
});

it('should return CSV format when results are present', async () => {
    const req = { query: { format: 'csv' }, body: { keys: ['TEST-1'] } };
    const result = await controller.forceStart(req);
    expect(result.headers['Content-Type']).toBe('text/csv');
    // Add more assertions based on expected CSV content
});