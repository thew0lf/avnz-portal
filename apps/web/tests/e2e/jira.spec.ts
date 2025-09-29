import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API Tests', () => {
  const validToken = 'your_valid_token_here'; // Replace with a valid token
  const validKeys = ['TEST-1', 'TEST-2']; // Replace with valid issue keys

  test('Valid Token and Keys', async ({ request }) => {
    const response = await request.post('/jira/force-start', {
      headers: {
        'x-service-token': validToken,
      },
      data: {
        keys: validKeys,
      },
    });
    expect(response.status()).toBe(200);
  });

  test('Missing Keys', async ({ request }) => {
    const response = await request.post('/jira/force-start', {
      headers: {
        'x-service-token': validToken,
      },
      data: {},
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({
      message: 'missing keys',
    }));
  });

  test('Invalid Token', async ({ request }) => {
    const response = await request.post('/jira/force-start', {
      headers: {
        'x-service-token': 'invalid_token',
      },
      data: {
        keys: validKeys,
      },
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({
      message: 'unauthorized',
    }));
  });

  test('Missing JIRA Environment Variables', async ({ request }) => {
    const response = await request.post('/jira/force-start', {
      headers: {
        'x-service-token': validToken,
      },
      data: {
        keys: validKeys,
      },
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({
      message: 'missing_jira_env',
    }));
  });

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
});