import { test, expect } from '@playwright/test';

test.describe('Jira Force Start Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Setup: Clear environment variables (mocking)
        await page.evaluate(() => {
            process.env.JIRA_DOMAIN = '';
            process.env.JIRA_EMAIL = '';
            process.env.JIRA_API_TOKEN = '';
            process.env.JIRA_PROJECT_KEY = '';
            process.env.JIRA_DEFAULT_ORG_CODE = '';
        });
    });

    test('should throw BadRequestException for missing environment variables', async ({ page }) => {
        const response = await page.request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('BadRequestException');
    });

    test('should throw ForbiddenException for unauthorized access', async ({ page }) => {
        // Setup: Set environment variables
        await page.evaluate(() => {
            process.env.JIRA_DOMAIN = 'test-domain';
            process.env.JIRA_EMAIL = 'test-email';
            process.env.JIRA_API_TOKEN = 'test-token';
            process.env.JIRA_PROJECT_KEY = 'test-project';
            process.env.JIRA_DEFAULT_ORG_CODE = 'test-org-code';
        });

        const response = await page.request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'], user: {} }
        });
        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.message).toContain('ForbiddenException');
    });

    test('should execute successfully with valid user', async ({ page }) => {
        // Setup: Set environment variables and valid user
        await page.evaluate(() => {
            process.env.JIRA_DOMAIN = 'test-domain';
            process.env.JIRA_EMAIL = 'test-email';
            process.env.JIRA_API_TOKEN = 'test-token';
            process.env.JIRA_PROJECT_KEY = 'test-project';
            process.env.JIRA_DEFAULT_ORG_CODE = 'test-org-code';
        });

        const response = await page.request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'], user: { authorized: true } }
        });
        expect(response.status()).toBe(200);
    });

    test('should throw ForbiddenException for invalid user object', async ({ page }) => {
        // Setup: Set environment variables
        await page.evaluate(() => {
            process.env.JIRA_DOMAIN = 'test-domain';
            process.env.JIRA_EMAIL = 'test-email';
            process.env.JIRA_API_TOKEN = 'test-token';
            process.env.JIRA_PROJECT_KEY = 'test-project';
            process.env.JIRA_DEFAULT_ORG_CODE = 'test-org-code';
        });

        const response = await page.request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'], user: { authorized: false } }
        });
        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.message).toContain('ForbiddenException');
    });
});