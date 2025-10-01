import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API Tests', () => {
    const serviceToken = process.env.SERVICE_TOKEN || 'mock_service_token';

    test('should throw BadRequestException for missing user object', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'] },
            headers: { 'x-service-token': serviceToken }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('User object is required.');
    });

    test('should throw BadRequestException for invalid keys format', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: [123], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': serviceToken }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('All keys must be strings.');
    });

    test('should throw BadRequestException for missing keys', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: [], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': serviceToken }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing keys.');
    });

    test('should throw BadRequestException for empty string in keys', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: [''], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': serviceToken }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('All keys must be strings.');
    });

    test('should execute successfully with valid keys and user role', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } },
            headers: { 'x-service-token': serviceToken }
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('success', true);
    });

    test('should throw ForbiddenException for invalid user role', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'InvalidRole' } },
            headers: { 'x-service-token': serviceToken }
        });
        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.message).toContain('Invalid user role.');
    });

    test('should throw BadRequestException for missing req.body', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            headers: { 'x-service-token': serviceToken }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('User object is required.');
    });
});