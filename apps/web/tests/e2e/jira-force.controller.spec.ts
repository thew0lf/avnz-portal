import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API Tests', () => {
    const serviceToken = process.env.SERVICE_TOKEN || 'mock_service_token';

    test('should return CSV format when ?format=csv is requested', async ({ request }) => {
        const response = await request.post('/jira/force-start?format=csv', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': serviceToken }
        });
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('text/csv');
        const csvData = await response.text();
        expect(csvData).toContain('AVNZ-1'); // Validate CSV content as needed
    });

    test('should return 403 for invalid user role', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'InvalidRole' } },
            headers: { 'x-service-token': serviceToken }
        });
        expect(response.status()).toBe(403);
        const responseBody = await response.json();
        expect(responseBody.message).toBe('Invalid user role.');
    });

    test('should return 400 for missing keys', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': serviceToken }
        });
        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.message).toBe('Missing keys.');
    });

    test('should return 403 for unauthorized access', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': 'invalid_token' }
        });
        expect(response.status()).toBe(403);
        const responseBody = await response.json();
        expect(responseBody.message).toBe('Unauthorized access.');
    });
});