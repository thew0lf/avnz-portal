import { createMocks } from 'node-mocks-http';
import { GET } from './route';

describe('GET /api/rps/transactions', () => {
  it('returns unauthorized if no token', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await GET(req, res);
    expect(res._getStatusCode()).toBe(401);
  });
  it('returns successful response for valid token', async () => {
    const { req, res } = createMocks({ method: 'GET', headers: { authorization: 'Bearer valid_token' } });
    await GET(req, res);
    expect(res._getStatusCode()).toBe(200);
  });
  // Additional tests for error handling
});