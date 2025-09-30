import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API Tests', () => {
    test('should throw ForbiddenException for unauthorized access', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': 'invalid_token' }
        });
        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.message).toContain('Unauthorized access.');
    });

    test('should throw BadRequestException for missing keys', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: [], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing keys.');
    });

    test('should throw BadRequestException for missing JIRA_PROJECT_KEY', async ({ request }) => {
        const originalProjectKey = process.env.JIRA_PROJECT_KEY;
        process.env.JIRA_PROJECT_KEY = '';
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing required JIRA environment variables.');
        process.env.JIRA_PROJECT_KEY = originalProjectKey; // Rollback
    });

    test('should throw ForbiddenException for invalid user role', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'InvalidRole' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.message).toContain('Invalid user role.');
    });

    test('should execute successfully with valid request for OrgAdmin', async ({ request }) => {
        process.env.JIRA_PROJECT_KEY = 'your_project_key_here';
        process.env.JIRA_DEFAULT_ORG_CODE = 'your_org_code_here';
        process.env.JIRA_EMAIL = 'your_email_here';
        process.env.JIRA_API_TOKEN = 'your_api_token_here';
        process.env.SERVICE_TOKEN = 'mock_service_token';

        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgAdmin' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('success', true);
    });

    test('should handle boundary tests for keys', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: Array(1000).fill('AVNZ-1'), user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('success', true);
    });

    test('should handle boundary tests for 0 keys', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: [], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing keys.');
    });

    test('should implement security tests for SQL injection', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1; DROP TABLE users;'], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(200);
    });

    test('should handle external service call failure', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('External service call failed.');
    });
});