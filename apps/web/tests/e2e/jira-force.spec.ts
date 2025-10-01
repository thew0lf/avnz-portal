import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API Tests', () => {
    test('should throw BadRequestException for missing user object', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'] }, // Missing user object
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing user object.');
    });

    test('should throw BadRequestException for invalid keys format', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: [123], user: { role: 'OrgOwner' } }, // Invalid key format
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Invalid keys format.');
    });

    test('should throw BadRequestException for missing keys', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: [], user: { role: 'OrgOwner' } }, // Empty keys
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Missing keys.');
    });

    test('should throw BadRequestException for large input boundary', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: Array(1001).fill('AVNZ-1'), user: { role: 'OrgOwner' } }, // 1001 keys
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('Too many keys.');
    });

    test('should execute successfully with SQL injection', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1; DROP TABLE users;'], user: { role: 'OrgOwner' } }, // SQL injection
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(200); // Should succeed
    });

    test('should execute successfully with XSS script', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['<script>alert(1)</script>'], user: { role: 'OrgOwner' } }, // XSS script
            headers: { 'x-service-token': process.env.SERVICE_TOKEN || 'mock_service_token' }
        });
        expect(response.status()).toBe(200); // Should succeed
    });
});