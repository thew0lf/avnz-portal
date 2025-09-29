import { test, expect } from '@playwright/test';

test.describe('Jira API Tests', () => {
    test('should throw BadRequestException for missing keys', async ({ request }) => {
        const response = await request.post('/jira', { data: {} });
        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.message).toContain('missing keys');
    });

    test('should throw BadRequestException for invalid issue key format', async ({ request }) => {
        const response = await request.post('/jira', { data: { keys: ['INVALID-KEY'] } });
        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.message).toContain('Invalid issue key format');
    });

    test('should return issue data for valid keys', async ({ request }) => {
        const response = await request.post('/jira', { data: { keys: ['TEST-1'] } });
        expect(response.status()).toBe(200);
        const responseBody = await response.json();
        expect(responseBody).toHaveProperty('data');
        expect(responseBody.data).toHaveProperty('summary');
        expect(responseBody.data).toHaveProperty('description');
    });

    test('should handle error scenarios gracefully', async ({ request }) => {
        const response = await request.post('/jira', { data: { keys: ['TEST-INVALID'] } });
        expect(response.status()).toBe(200);
        const responseBody = await response.json();
        expect(responseBody).toEqual(expect.arrayContaining([{ key: 'TEST-INVALID', error: expect.any(String) }]));
    });

    test('should return empty CSV when results are empty', async ({ request }) => {
        const response = await request.post('/jira?format=csv', { data: { keys: [] } });
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toBe('text/csv');
        const responseBody = await response.text();
        expect(responseBody).toBe('');
    });
});