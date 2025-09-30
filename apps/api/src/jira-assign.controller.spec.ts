import { Test, TestingModule } from '@nestjs/testing';
import { JiraAssignController } from './jira-assign.controller';
import { BadRequestException } from '@nestjs/common';

describe('JiraAssignController', () => {
    let controller: JiraAssignController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [JiraAssignController],
        }).compile();

        controller = module.get<JiraAssignController>(JiraAssignController);
    });

    it('should throw BadRequestException for missing environment variables', async () => {
        process.env.JIRA_DOMAIN = '';
        process.env.JIRA_EMAIL = '';
        process.env.JIRA_API_TOKEN = '';
        await expect(controller.assignDev({ headers: { 'x-service-token': 'token' }, body: { keys: [] } })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for multiple missing environment variables', async () => {
        process.env.JIRA_DOMAIN = '';
        process.env.JIRA_EMAIL = '';
        process.env.JIRA_API_TOKEN = '';
        process.env.JIRA_DEFAULT_ORG_CODE = '';
        await expect(controller.assignDev({ headers: { 'x-service-token': 'token' }, body: { keys: [] } })).rejects.toThrow(BadRequestException);
    });
});