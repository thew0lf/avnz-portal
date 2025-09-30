// apps/web/tests/e2e/jira.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Jira Integration Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Set up environment variables
        await page.context().addInitScript(() => {
            process.env.JIRA_PROJECT_KEY = 'AVNZ-1';
            process.env.JIRA_DEFAULT_ORG_CODE = 'ORG123';
            process.env.JIRA_EMAIL = 'test-email@example.com';
            process.env.JIRA_API_TOKEN = 'test-token';
        });
    });

    test('should throw BadRequestException for missing JIRA_PROJECT_KEY', async ({ page }) => {
        await page.context().addInitScript(() => {
            process.env.JIRA_PROJECT_KEY = '';
        });
        const response = await page.request.post('/api/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('JIRA_PROJECT_KEY is required.');
    });

    test('should throw BadRequestException for missing JIRA_DEFAULT_ORG_CODE', async ({ page }) => {
        await page.context().addInitScript(() => {
            process.env.JIRA_DEFAULT_ORG_CODE = '';
        });
        const response = await page.request.post('/api/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('JIRA_DEFAULT_ORG_CODE is required.');
    });

    test('should throw BadRequestException for missing JIRA_EMAIL', async ({ page }) => {
        await page.context().addInitScript(() => {
            process.env.JIRA_EMAIL = '';
        });
        const response = await page.request.post('/api/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('JIRA_EMAIL is required.');
    });

    test('should throw BadRequestException for missing JIRA_API_TOKEN', async ({ page }) => {
        await page.context().addInitScript(() => {
            process.env.JIRA_API_TOKEN = '';
        });
        const response = await page.request.post('/api/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('JIRA_API_TOKEN is required.');
    });

    test('should throw ForbiddenException for unauthorized access', async ({ page }) => {
        await page.context().addInitScript(() => {
            // Mock unauthorized user
            window.localStorage.setItem('user', JSON.stringify({ authorized: false }));
        });
        const response = await page.request.post('/api/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
        });
        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.message).toContain('You do not have permission to access this resource.');
    });
});