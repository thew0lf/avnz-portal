import { createMocks } from 'node-mocks-http';
import { GET } from './route';

describe('GET /api/rps/transactions', () => {
  it('returns unauthorized if no token', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await GET(req, res);
    expect(res._getStatusCode()).toBe(401);
  });
  // Additional tests for successful response and error handling
});