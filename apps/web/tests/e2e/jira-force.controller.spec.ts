import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API Tests', () => {
    test('should throw BadRequestException for missing JIRA_DOMAIN', async ({ request }) => {
        process.env.JIRA_DOMAIN = '';
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing required JIRA environment variables.');
    });

    test('should throw BadRequestException for missing JIRA_PROJECT_KEY', async ({ request }) => {
        process.env.JIRA_PROJECT_KEY = '';
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing required JIRA environment variables.');
    });

    test('should throw BadRequestException for invalid keys format', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: [123], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Invalid keys format.');
    });

    test('should throw BadRequestException for missing user object', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'] },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing user object.');
    });

    test('should handle boundary tests for large inputs', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: Array(1001).fill('AVNZ-1'), user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Input exceeds maximum allowed size.');
    });

    test('should handle SQL injection safely', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1; DROP TABLE users;'], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Invalid keys format.');
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