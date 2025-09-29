import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API', () => {
    test('should throw BadRequestException for missing keys', async ({ request }) => {
        const response = await request.post('/jira/forceStart', { data: {} });
        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.message).toContain('missing keys');
    });

    test('should throw BadRequestException for invalid issue key format', async ({ request }) => {
        const response = await request.post('/jira/forceStart', { data: { keys: ['INVALID-KEY'] } });
        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.message).toContain('Invalid issue key format');
    });

    test('should return issue data for valid issue key', async ({ request }) => {
        const response = await request.post('/jira/forceStart', { data: { keys: ['PROJECT-123'] } });
        expect(response.status()).toBe(200);
        const responseBody = await response.json();
        expect(responseBody).toBeDefined();
        expect(responseBody[0].key).toBe('PROJECT-123');
        // Add more assertions based on expected issue data
    });

    test('should throw ForbiddenException for unauthorized access', async ({ request }) => {
        const response = await request.post('/jira/forceStart', { data: { keys: ['PROJECT-123'] }, headers: {} });
        expect(response.status()).toBe(403);
        const responseBody = await response.json();
        expect(responseBody.message).toContain('You do not have permission to access this resource.');
    });

    test('should return missing_config for empty JIRA_DOMAIN', async ({ request }) => {
        // Temporarily set JIRA_DOMAIN to empty
        process.env.JIRA_DOMAIN = '';
        const response = await request.post('/jira/forceStart', { data: { keys: ['PROJECT-123'] } });
        expect(response.status()).toBe(500); // Assuming it results in a server error
        const responseBody = await response.json();
        expect(responseBody.ok).toBe(false);
        expect(responseBody.reason).toBe('missing_config');
        // Restore JIRA_DOMAIN after test
        process.env.JIRA_DOMAIN = 'your_original_domain_here'; // Replace with the actual original value
    });
});