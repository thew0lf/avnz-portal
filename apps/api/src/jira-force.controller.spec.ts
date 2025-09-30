import { Test, TestingModule } from '@nestjs/testing';
import { JiraForceController } from './jira-force.controller';
import { BadRequestException } from '@nestjs/common';

describe('JiraForceController', () => {
    let controller: JiraForceController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [JiraForceController],
        }).compile();

        controller = module.get<JiraForceController>(JiraForceController);
    });

    it('should throw BadRequestException for missing JIRA_DEFAULT_ORG_CODE', async () => {
        process.env.JIRA_DEFAULT_ORG_CODE = '';
        await expect(controller.forceStart({ body: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } } })).rejects.toThrow(BadRequestException);
    });
});