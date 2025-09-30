import { BadRequestException } from '@nestjs/common';
import { JiraController } from './jira.controller';

describe('JiraController', () => {
    let controller: JiraController;

    beforeEach(() => {
        controller = new JiraController();
    });

    it('should throw BadRequestException for missing JIRA_PROJECT_KEY', async () => {
        process.env.JIRA_DOMAIN = 'test-domain';
        process.env.JIRA_EMAIL = 'test-email';
        process.env.JIRA_API_TOKEN = 'test-token';
        process.env.JIRA_PROJECT_KEY = '';
        await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] } })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing JIRA_DEFAULT_ORG_CODE', async () => {
        process.env.JIRA_DOMAIN = 'test-domain';
        process.env.JIRA_EMAIL = 'test-email';
        process.env.JIRA_API_TOKEN = 'test-token';
        process.env.JIRA_PROJECT_KEY = 'test-project';
        process.env.JIRA_DEFAULT_ORG_CODE = '';
        await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] } })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing JIRA_EMAIL', async () => {
        process.env.JIRA_DOMAIN = 'test-domain';
        process.env.JIRA_EMAIL = '';
        process.env.JIRA_API_TOKEN = 'test-token';
        process.env.JIRA_PROJECT_KEY = 'test-project';
        process.env.JIRA_DEFAULT_ORG_CODE = 'test-org';
        await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] } })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing JIRA_API_TOKEN', async () => {
        process.env.JIRA_DOMAIN = 'test-domain';
        process.env.JIRA_EMAIL = 'test-email';
        process.env.JIRA_API_TOKEN = '';
        process.env.JIRA_PROJECT_KEY = 'test-project';
        process.env.JIRA_DEFAULT_ORG_CODE = 'test-org';
        await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] } })).rejects.toThrow(BadRequestException);
    });
});