import { Test, TestingModule } from '@nestjs/testing';
import { JiraForceController } from './jira-force.controller';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('JiraForceController', () => {
  let controller: JiraForceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JiraForceController],
    }).compile();

    controller = module.get<JiraForceController>(JiraForceController);
  });

  it('should throw ForbiddenException for invalid user role', async () => {
    const user = { role: 'InvalidRole' };
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'], user } })).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException for missing environment variables', async () => {
    process.env.JIRA_DOMAIN = '';
    process.env.JIRA_EMAIL = '';
    process.env.JIRA_API_TOKEN = '';
    await expect(controller.forceStart({ body: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } } })).rejects.toThrow(BadRequestException);
  });
});