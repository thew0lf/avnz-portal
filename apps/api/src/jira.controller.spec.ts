  it('should return CSV format when format=csv', async () => {
    const req = { query: { format: 'csv' }, body: { keys: ['TEST-1'] } };
    const result = await controller.forceStart(req);
    expect(result.headers['Content-Type']).toBe('text/csv');
  });