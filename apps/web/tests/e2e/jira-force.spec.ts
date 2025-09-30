import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API Tests', () => {
    test('should throw BadRequestException for unauthorized access', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': 'invalid_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Unauthorized access. Please check your service token.');
    });

    test('should throw BadRequestException for missing keys', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: [], user: { role: 'OrgOwner' } }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing keys. Please provide valid keys.');
    });

    test('should throw BadRequestException for missing JIRA_PROJECT_KEY', async ({ request }) => {
        process.env.JIRA_PROJECT_KEY = '';
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing required JIRA environment variables.');
    });

    test('should throw BadRequestException for missing JIRA_DEFAULT_ORG_CODE', async ({ request }) => {
        process.env.JIRA_DEFAULT_ORG_CODE = '';
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing required JIRA environment variables.');
    });

    test('should execute successfully with valid request', async ({ request }) => {
        process.env.JIRA_PROJECT_KEY = 'your_project_key_here';
        process.env.JIRA_DEFAULT_ORG_CODE = 'your_org_code_here';
        process.env.JIRA_EMAIL = 'your_email_here';
        process.env.JIRA_API_TOKEN = 'your_api_token_here';
        process.env.SERVICE_TOKEN = 'valid_token';

        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': 'valid_token' }
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('success', true);
    });

    test('should throw ForbiddenException for invalid user role', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'InvalidRole' } },
            headers: { 'x-service-token': 'valid_token' }
        });
        expect(response.status()).toBe(403);
    });
});