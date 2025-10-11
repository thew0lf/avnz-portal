import { Test, TestingModule } from '@nestjs/testing';
import { JiraForceController } from './jira-force.controller';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { parse } from 'json2csv'; // Import for CSV validation

describe('JiraForceController', () => {
    let controller: JiraForceController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [JiraForceController],
        }).compile();

        controller = module.get<JiraForceController>(JiraForceController);
    });

    // ... existing tests ...

    it('should return CSV format when ?format=csv is requested', async () => {
        const req = { query: { format: 'csv' }, body: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } }, headers: { 'x-service-token': 'mock_service_token' } };
        const res = { send: jest.fn(), header: jest.fn() };

        await controller.forceStart(req, res);
        
        expect(res.header).toHaveBeenCalledWith('Content-Type', 'text/csv');
        expect(res.send).toHaveBeenCalled(); // You can further validate the CSV content if needed
    });
});