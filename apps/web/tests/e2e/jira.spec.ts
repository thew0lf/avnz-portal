import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API Tests', () => {
  const baseUrl = 'http://localhost:3000'; // Update with your base URL
  const validToken = 'your_valid_token'; // Replace with a valid token
  const invalidToken = 'invalid_token';
  const validKeys = ['TEST-1', 'TEST-2'];
  const emptyKeys = [];
  const invalidOrgCode = 'INVALID_ORG_CODE';

  test('Valid Token and Keys Provided', async ({ request }) => {
    const response = await request.post(`${baseUrl}/jira/force-start`, {
      headers: {
        'x-service-token': validToken,
      },
      data: {
        keys: validKeys,
      },
    });
    expect(response.status()).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('results');
  });

  test('Missing Keys', async ({ request }) => {
    const response = await request.post(`${baseUrl}/jira/force-start`, {
      headers: {
        'x-service-token': validToken,
      },
      data: {
        keys: emptyKeys,
      },
    });
    expect(response.status()).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.message).toBe('missing keys');
  });

  test('Invalid Token', async ({ request }) => {
    const response = await request.post(`${baseUrl}/jira/force-start`, {
      headers: {
        'x-service-token': invalidToken,
      },
      data: {
        keys: validKeys,
      },
    });
    expect(response.status()).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.message).toBe('unauthorized');
  });

  test('Missing Jira Environment Variables', async ({ request }) => {
    const response = await request.post(`${baseUrl}/jira/force-start`, {
      headers: {
        'x-service-token': validToken,
      },
      data: {
        keys: validKeys,
      },
    });
    expect(response.status()).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.message).toBe('missing_jira_env');
  });

  test('Unknown Organization Code', async ({ request }) => {
    const response = await request.post(`${baseUrl}/jira/force-start`, {
      headers: {
        'x-service-token': validToken,
      },
      data: {
        keys: validKeys,
        orgCode: invalidOrgCode,
      },
    });
    expect(response.status()).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.message).toBe('unknown_org');
  });
});