import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API Tests', () => {
    const serviceToken = process.env.SERVICE_TOKEN || 'mock_service_token';

    test('should return 400 for non-string values in keys', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: [123, { key: 'AVNZ-1' }], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': serviceToken }
        });
        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.message).toBe('All keys must be strings.');
    });

    test('should return 400 for null keys', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: null, user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': serviceToken }
        });
        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.message).toBe('Missing keys.');
    });

    test('should return 400 for undefined keys', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': serviceToken }
        });
        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.message).toBe('Missing keys.');
    });

    test('should return 400 for invalid JSON in request body', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: 'invalid_json',
            headers: { 'x-service-token': serviceToken }
        });
        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.message).toBe('Invalid request body.');
    });
});