import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API Tests', () => {
    test.beforeEach(async ({ request }) => {
        // Set environment variables for the tests
        process.env.JIRA_DOMAIN = 'test-domain';
        process.env.JIRA_EMAIL = 'test-email';
        process.env.JIRA_API_TOKEN = 'test-token';
        process.env.JIRA_PROJECT_KEY = 'test-project';
        process.env.JIRA_DEFAULT_ORG_CODE = 'test-org-code';
    });

    test('should throw BadRequestException for missing environment variables', async ({ request }) => {
        // Clear all required environment variables
        process.env.JIRA_DOMAIN = '';
        process.env.JIRA_EMAIL = '';
        process.env.JIRA_API_TOKEN = '';
        process.env.JIRA_PROJECT_KEY = '';
        process.env.JIRA_DEFAULT_ORG_CODE = '';

        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] }
        });

        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.message).toContain('are required');
    });

    test('should throw BadRequestException for partial missing variables', async ({ request }) => {
        process.env.JIRA_PROJECT_KEY = '';

        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] }
        });

        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.message).toContain('JIRA_PROJECT_KEY is required.');
    });
});