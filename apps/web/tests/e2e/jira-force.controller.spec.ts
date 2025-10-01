import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API Tests', () => {
    test('should throw BadRequestException for missing JIRA_EMAIL', async ({ request }) => {
        process.env.JIRA_EMAIL = '';
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgAdmin' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing required JIRA environment variables.');
    });

    test('should throw BadRequestException for missing JIRA_API_TOKEN', async ({ request }) => {
        process.env.JIRA_API_TOKEN = '';
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgAdmin' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing required JIRA environment variables.');
    });

    test('should throw BadRequestException for missing JIRA_DEFAULT_ORG_CODE', async ({ request }) => {
        process.env.JIRA_DEFAULT_ORG_CODE = '';
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgAdmin' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing required JIRA environment variables.');
    });

    test('should execute successfully with all required variables', async ({ request }) => {
        process.env.JIRA_PROJECT_KEY = 'your_project_key_here';
        process.env.JIRA_EMAIL = 'your_email_here';
        process.env.JIRA_API_TOKEN = 'your_api_token_here';
        process.env.JIRA_DEFAULT_ORG_CODE = 'your_org_code_here';
        process.env.SERVICE_TOKEN = 'mock_service_token';

        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgAdmin' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('success', true);
    });

    test('should handle concurrency tests', async ({ request }) => {
        const responses = await Promise.all(Array.from({ length: 10 }, () =>
            request.post('/jira/force-start', {
                data: { keys: ['AVNZ-1'], user: { role: 'OrgAdmin' } },
                headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
            })
        ));
        responses.forEach(response => {
            expect(response.status()).toBe(200);
        });
    });
});