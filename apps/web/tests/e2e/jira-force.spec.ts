import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API Tests', () => {
    test('should throw BadRequestException for missing JIRA_DEFAULT_ORG_CODE', async ({ request }) => {
        process.env.JIRA_DEFAULT_ORG_CODE = '';
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('missing_jira_env');
    });

    test('should throw ForbiddenException for invalid user role', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'InvalidRole' } }
        });
        expect(response.status()).toBe(403);
    });

    test('should throw BadRequestException for missing environment variables', async ({ request }) => {
        process.env.JIRA_DOMAIN = '';
        process.env.JIRA_EMAIL = '';
        process.env.JIRA_API_TOKEN = '';
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('missing_jira_env');
    });

    test('should throw BadRequestException for missing keys', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: [], user: { role: 'OrgOwner' } }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('missing keys');
    });

    test('should successfully update with valid keys and environment variables', async ({ request }) => {
        process.env.JIRA_DOMAIN = 'tandgconsulting.atlassian.net';
        process.env.JIRA_EMAIL = 'bill@tandgconsulting.com';
        process.env.JIRA_API_TOKEN = 'your_api_token_here';
        process.env.JIRA_DEFAULT_ORG_CODE = 'your_org_code_here';

        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } }
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('ok', true);
    });

    test('should allow access for valid user roles', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } }
        });
        expect(response.status()).toBe(200);
    });
});