it('should handle error scenarios gracefully', async () => {
    const req = { query: { format: 'csv' }, body: { keys: ['TEST-1'] } };
    // Simulate an error
    jest.spyOn(controller, 'forceStart').mockImplementation(() => { throw new Error('Test error'); });
    await expect(controller.forceStart(req)).rejects.toThrow(BadRequestException);
});

it('should return empty CSV when results are empty', async () => {
    const req = { query: { format: 'csv' }, body: { keys: [] } }; // Empty keys
    const result = await controller.forceStart(req);
    expect(result.headers['Content-Type']).toBe('text/csv');
    expect(result.body).toBe(''); // Expect empty CSV
});