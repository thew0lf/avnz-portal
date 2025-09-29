import { test, expect } from '@playwright/test';

test.describe('JIRA API Tests', () => {
    test('should throw BadRequestException for missing JIRA_DOMAIN', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
            headers: { authorization: 'Bearer valid_token' }
        });
        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.message).toContain('JIRA_DOMAIN is required.');
    });

    test('should throw ForbiddenException for unauthorized access', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
            headers: { authorization: '' }
        });
        expect(response.status()).toBe(403);
        const responseBody = await response.json();
        expect(responseBody.message).toContain('You do not have permission to access this resource.');
    });

    test('should handle multiple fetch calls efficiently', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1', 'AVNZ-2'] },
            headers: { authorization: 'Bearer valid_token' }
        });
        expect(response.status()).toBe(200);
        const result = await response.json();
        expect(result).toBeDefined();
    });

    test('should handle missing configuration gracefully in backfill', async ({ request }) => {
        const response = await request.post('/jira/backfillInProgress', {
            headers: { authorization: 'Bearer valid_token' }
        });
        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody.ok).toBe(false);
        expect(responseBody.reason).toBe('missing_config');
    });
});