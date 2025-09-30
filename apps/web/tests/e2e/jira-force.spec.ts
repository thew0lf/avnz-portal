import { test, expect } from '@playwright/test';

test.describe('Jira Force Start API Tests', () => {
    
    test('should throw ForbiddenException for invalid user role', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'InvalidRole' } }
        });
        expect(response.status()).toBe(403);
    });

    test('should throw BadRequestException for missing environment variables', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('missing_jira_env');
    });

    test('should throw BadRequestException for missing keys', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: [], user: { role: 'OrgOwner' } }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('missing keys');
    });

    test('should throw BadRequestException for unknown organization', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' }, orgCode: 'InvalidOrg' }
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('unknown_org');
    });

    test('should successfully update with valid keys and environment variables', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } }
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('ok', true);
    });

    test('should allow access for valid user roles', async ({ request }) => {
        const response = await request.post('/jira/force-start', {
            data: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } }
        });
        expect(response.status()).toBe(200);
    });
});