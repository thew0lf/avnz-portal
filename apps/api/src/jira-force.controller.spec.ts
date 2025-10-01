import { Test, TestingModule } from '@nestjs/testing';
import { JiraForceController } from './jira-force.controller';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('JiraForceController', () => {
    let controller: JiraForceController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [JiraForceController],
        }).compile();

        controller = module.get<JiraForceController>(JiraForceController);
    });

    it('should throw BadRequestException for missing JIRA_DOMAIN', async () => {
        process.env.JIRA_DOMAIN = '';
        await expect(controller.forceStart({ body: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } } })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing JIRA_PROJECT_KEY', async () => {
        process.env.JIRA_PROJECT_KEY = '';
        await expect(controller.forceStart({ body: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } } })).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
        process.env.SERVICE_TOKEN = 'valid_token';
        await expect(controller.forceStart({ headers: { 'x-service-token': 'invalid_token' }, body: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } } })).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for invalid user role', async () => {
        await expect(controller.forceStart({ body: { keys: ['AVNZ-1'], user: { role: 'InvalidRole' } } })).rejects.toThrow(ForbiddenException);
    });

    it('should handle boundary tests for keys', async () => {
        const response = await controller.forceStart({ body: { keys: Array(1000).fill('AVNZ-1'), user: { role: 'OrgOwner' } } });
        expect(response).toBeDefined();
    });

    it('should handle boundary tests for 0 keys', async () => {
        await expect(controller.forceStart({ body: { keys: [], user: { role: 'OrgOwner' } } })).rejects.toThrow(BadRequestException);
    });

    it('should implement security tests for SQL injection', async () => {
        const response = await controller.forceStart({ body: { keys: ['AVNZ-1; DROP TABLE users;'], user: { role: 'OrgOwner' } } });
        expect(response).toBeDefined();
    });

    it('should handle external service call failure', async () => {
        await expect(controller.forceStart({ body: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } } })).rejects.toThrow(BadRequestException);
    });

    it('should validate presence of all required environment variables', async () => {
        process.env.JIRA_DOMAIN = '';
        process.env.JIRA_EMAIL = '';
        process.env.JIRA_API_TOKEN = '';
        process.env.JIRA_DEFAULT_ORG_CODE = '';
        process.env.JIRA_PROJECT_KEY = '';
        await expect(controller.forceStart({ body: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } } })).rejects.toThrow(BadRequestException);
    });
});