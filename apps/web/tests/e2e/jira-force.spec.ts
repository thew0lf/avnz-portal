// apps/web/tests/e2e/jira-force.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API Tests', () => {
    test.beforeEach(async ({ request }) => {
        process.env.JIRA_DOMAIN = 'test-domain';
        process.env.JIRA_EMAIL = 'test-email';
        process.env.JIRA_API_TOKEN = 'test-token';
        process.env.JIRA_PROJECT_KEY = 'test-project';
        process.env.JIRA_DEFAULT_ORG_CODE = 'test-org-code';
    });

    test('should throw ForbiddenException for invalid user role', async ({ request }) => {
        const user = { role: 'InvalidRole' };
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'], user }
        });

        expect(response.status()).toBe(403); // Forbidden
    });

    test('should throw BadRequestException for missing environment variables', async ({ request }) => {
        const requiredVars = ['JIRA_DOMAIN', 'JIRA_EMAIL', 'JIRA_API_TOKEN', 'JIRA_PROJECT_KEY', 'JIRA_DEFAULT_ORG_CODE'];
        requiredVars.forEach(varName => {
            process.env[varName] = '';
        });

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
        expect(responseBody.message).toContain('JIRA_PROJECT_KEY is required');
    });

    test('should execute without exceptions for valid role access', async ({ request }) => {
        const user = { role: 'OrgOwner' };
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'], user }
        });

        expect(response.status()).toBe(200); // OK
    });
});