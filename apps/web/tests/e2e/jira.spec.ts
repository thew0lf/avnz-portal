import { test, expect } from '@playwright/test';

test.describe('Jira AVNZ-11 Acceptance Tests', () => {
    test('should throw BadRequestException for missing JIRA_PROJECT_KEY', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
            headers: {
                'JIRA_DOMAIN': 'test-domain',
                'JIRA_EMAIL': 'test-email',
                'JIRA_API_TOKEN': 'test-token',
                'JIRA_PROJECT_KEY': '',
                'JIRA_DEFAULT_ORG_CODE': 'test-org-code'
            }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('JIRA_PROJECT_KEY is required.');
    });

    test('should throw BadRequestException for missing JIRA_DEFAULT_ORG_CODE', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
            headers: {
                'JIRA_DOMAIN': 'test-domain',
                'JIRA_EMAIL': 'test-email',
                'JIRA_API_TOKEN': 'test-token',
                'JIRA_PROJECT_KEY': 'test-project',
                'JIRA_DEFAULT_ORG_CODE': ''
            }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('JIRA_DEFAULT_ORG_CODE is required.');
    });

    test('should throw BadRequestException for missing JIRA_EMAIL', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
            headers: {
                'JIRA_DOMAIN': 'test-domain',
                'JIRA_EMAIL': '',
                'JIRA_API_TOKEN': 'test-token',
                'JIRA_PROJECT_KEY': 'test-project',
                'JIRA_DEFAULT_ORG_CODE': 'test-org-code'
            }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('JIRA_EMAIL is required.');
    });

    test('should throw BadRequestException for missing JIRA_API_TOKEN', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
            headers: {
                'JIRA_DOMAIN': 'test-domain',
                'JIRA_EMAIL': 'test-email',
                'JIRA_API_TOKEN': '',
                'JIRA_PROJECT_KEY': 'test-project',
                'JIRA_DEFAULT_ORG_CODE': 'test-org-code'
            }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('JIRA_API_TOKEN is required.');
    });

    test('should throw ForbiddenException for unauthorized access', async ({ request }) => {
        const response = await request.post('/jira/forceStart', {
            data: { keys: ['AVNZ-1'] },
            headers: {
                'JIRA_DOMAIN': 'test-domain',
                'JIRA_EMAIL': 'test-email',
                'JIRA_API_TOKEN': 'test-token',
                'JIRA_PROJECT_KEY': 'test-project',
                'JIRA_DEFAULT_ORG_CODE': 'test-org-code'
            }
        });
        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.message).toContain('You do not have permission to access this resource.');
    });
});