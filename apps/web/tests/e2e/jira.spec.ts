import { test, expect } from '@playwright/test';

test.describe('Jira API Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Setup: Clear environment variables (simulated)
        await page.evaluate(() => {
            process.env.JIRA_DOMAIN = '';
            process.env.JIRA_EMAIL = '';
            process.env.JIRA_API_TOKEN = '';
            process.env.JIRA_PROJECT_KEY = '';
            process.env.JIRA_DEFAULT_ORG_CODE = '';
        });
    });

    test('should throw BadRequestException for missing environment variables', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { body: { keys: ['AVNZ-1'] } }
        });
        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.message).toContain('are required');
    });

    test('should throw ForbiddenException for unauthorized access', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { body: { keys: ['AVNZ-1'], user: {} } }
        });
        expect(response.status()).toBe(403);
        const responseBody = await response.json();
        expect(responseBody.message).toBe('You do not have permission to access this resource.');
    });

    test('should succeed for valid request', async ({ request }) => {
        // Setup: Set all environment variables
        await page.evaluate(() => {
            process.env.JIRA_DOMAIN = 'test-domain';
            process.env.JIRA_EMAIL = 'test-email';
            process.env.JIRA_API_TOKEN = 'test-token';
            process.env.JIRA_PROJECT_KEY = 'test-project';
            process.env.JIRA_DEFAULT_ORG_CODE = 'test-org-code';
        });

        const response = await request.post('/jira/forceStart', {
            data: { body: { keys: ['AVNZ-1'], user: { id: 'valid-user-id' } } }
        });
        expect(response.status()).toBe(200);
    });

    test('should throw BadRequestException for partial missing variables', async ({ request }) => {
        // Test each variable one by one
        const variables = ['JIRA_DOMAIN', 'JIRA_EMAIL', 'JIRA_API_TOKEN', 'JIRA_PROJECT_KEY', 'JIRA_DEFAULT_ORG_CODE'];
        for (const variable of variables) {
            await page.evaluate((varName) => {
                process.env[varName] = '';
            }, variable);

            const response = await request.post('/jira/forceStart', {
                data: { body: { keys: ['AVNZ-1'] } }
            });
            expect(response.status()).toBe(400);
            const responseBody = await response.json();
            expect(responseBody.message).toContain('are required');
        }
    });

    test('should throw ForbiddenException for invalid user object', async ({ request }) => {
        // Setup: Set all environment variables
        await page.evaluate(() => {
            process.env.JIRA_DOMAIN = 'test-domain';
            process.env.JIRA_EMAIL = 'test-email';
            process.env.JIRA_API_TOKEN = 'test-token';
            process.env.JIRA_PROJECT_KEY = 'test-project';
            process.env.JIRA_DEFAULT_ORG_CODE = 'test-org-code';
        });

        const response = await request.post('/jira/forceStart', {
            data: { body: { keys: ['AVNZ-1'], user: { id: 'invalid-user-id', role: 'none' } } }
        });
        expect(response.status()).toBe(403);
        const responseBody = await response.json();
        expect(responseBody.message).toBe('You do not have permission to access this resource.');
    });
});