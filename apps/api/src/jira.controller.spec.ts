import { Test, TestingModule } from '@nestjs/testing';
import { JiraController } from './jira.controller';
import { BadRequestException } from '@nestjs/common';

describe('JiraController', () => {
  let controller: JiraController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JiraController],
    }).compile();

    controller = module.get<JiraController>(JiraController);
  });

  it('should return CSV format when format=csv', async () => {
    const req = { query: { format: 'csv' }, body: { keys: ['TEST-1'] } };
    const result = await controller.forceStart(req);
    expect(result.headers['Content-Type']).toBe('text/csv');
  });

  it('should throw BadRequestException for missing keys', async () => {
    const req = { query: { format: 'csv' }, body: {} };
    await expect(controller.forceStart(req)).rejects.toThrow(BadRequestException);
  });
});