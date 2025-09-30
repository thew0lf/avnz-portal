import { test, expect } from '@playwright/test';

test.describe('Jira AVNZ-14 Tests', () => {
    test('should throw BadRequestException for missing JIRA_PROJECT_KEY', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
            headers: {
                'JIRA_PROJECT_KEY': '', // Simulating missing key
                'JIRA_DOMAIN': 'test-domain',
                'JIRA_EMAIL': 'test-email',
                'JIRA_API_TOKEN': 'test-token',
                'JIRA_DEFAULT_ORG_CODE': 'test-org-code'
            }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('BadRequestException');
    });

    test('should throw BadRequestException for missing JIRA_DEFAULT_ORG_CODE', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
            headers: {
                'JIRA_PROJECT_KEY': 'test-project',
                'JIRA_DOMAIN': 'test-domain',
                'JIRA_EMAIL': 'test-email',
                'JIRA_API_TOKEN': 'test-token',
                'JIRA_DEFAULT_ORG_CODE': '' // Simulating missing org code
            }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('BadRequestException');
    });

    test('should throw BadRequestException for missing JIRA_EMAIL', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
            headers: {
                'JIRA_PROJECT_KEY': 'test-project',
                'JIRA_DOMAIN': 'test-domain',
                'JIRA_EMAIL': '', // Simulating missing email
                'JIRA_API_TOKEN': 'test-token',
                'JIRA_DEFAULT_ORG_CODE': 'test-org-code'
            }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('BadRequestException');
    });

    test('should throw BadRequestException for missing JIRA_API_TOKEN', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
            headers: {
                'JIRA_PROJECT_KEY': 'test-project',
                'JIRA_DOMAIN': 'test-domain',
                'JIRA_EMAIL': 'test-email',
                'JIRA_API_TOKEN': '', // Simulating missing API token
                'JIRA_DEFAULT_ORG_CODE': 'test-org-code'
            }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('BadRequestException');
    });

    test('should throw ForbiddenException for unauthorized access', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
            headers: {
                'JIRA_PROJECT_KEY': 'test-project',
                'JIRA_DOMAIN': 'test-domain',
                'JIRA_EMAIL': 'test-email',
                'JIRA_API_TOKEN': 'test-token',
                'JIRA_DEFAULT_ORG_CODE': 'test-org-code',
                'Authorization': 'Bearer invalid-token' // Simulating unauthorized access
            }
        });
        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.message).toContain('ForbiddenException');
    });
});