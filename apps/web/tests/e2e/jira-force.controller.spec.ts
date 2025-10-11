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
});