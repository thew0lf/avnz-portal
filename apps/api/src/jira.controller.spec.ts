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

  it('should throw BadRequestException for missing keys', async () => {
    await expect(controller.forceStart({ body: {} })).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException for invalid issue key format', async () => {
    await expect(controller.forceStart({ body: { keys: ['INVALID-KEY'] } })).rejects.toThrow(BadRequestException);
  });
});