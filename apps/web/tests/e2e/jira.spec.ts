import { test, expect } from '@playwright/test';

test.describe('Jira API Tests', () => {
    test('CSV Format Handling', async ({ request }) => {
        const response = await request.get('/jira/forceStart?format=csv', {
            data: { keys: ['TEST-1', 'TEST-2'] }
        });
        expect(response.headers()['content-type']).toBe('text/csv');
        const body = await response.text();
        expect(body).toContain('Expected CSV Data'); // Replace with actual expected CSV data
    });

    test('Error Handling - Missing Configuration', async ({ request }) => {
        const response = await request.get('/jira/forceStart', {
            headers: { 'JIRA_DOMAIN': '' }
        });
        const result = await response.json();
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('missing_config');
    });

    test('Authorization Check', async ({ request }) => {
        const response = await request.get('/jira/forceStart', {
            headers: { 'Authorization': 'Bearer invalid_token' }
        });
        expect(response.status()).toBe(403);
    });

    test('Empty Keys Handling', async ({ request }) => {
        const response = await request.get('/jira/forceStart?format=csv', {
            data: { keys: [] }
        });
        expect(response.headers()['content-type']).toBe('text/csv');
        const body = await response.text();
        expect(body).toBe(''); // Expect empty CSV
    });

    test('Internal Error Handling', async ({ request }) => {
        const response = await request.get('/jira/forceStart', {
            data: { keys: ['TEST-1'] }
        });
        expect(response.status()).toBe(400);
        const result = await response.json();
        expect(result.reason).toBe('internal_error');
    });
});