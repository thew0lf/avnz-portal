import { test, expect } from '@playwright/test';

test.describe('JIRA API Tests', () => {
    test('should throw BadRequestException for missing JIRA_DOMAIN', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
            headers: { 'Authorization': 'Bearer valid_token' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('JIRA_DOMAIN is required.');
    });

    test('should throw ForbiddenException for unauthorized access', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
            headers: { 'Authorization': '' }
        });
        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.message).toContain('You do not have permission to access this resource.');
    });

    test('should handle multiple fetch calls efficiently', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1', 'AVNZ-2'] },
            headers: { 'Authorization': 'Bearer valid_token' }
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toBeDefined();
    });

    test('should handle missing configuration gracefully in backfill', async ({ request }) => {
        const response = await request.post('/jira/backfillInProgress', {
            headers: { 'Authorization': 'Bearer valid_token' }
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.ok).toBe(false);
        expect(body.reason).toBe('missing_config');
    });
});