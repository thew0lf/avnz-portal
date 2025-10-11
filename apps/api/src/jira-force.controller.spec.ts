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

    it('should return CSV format when ?format=csv is requested', async () => {
        const req = { query: { format: 'csv' }, body: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } }, headers: { 'x-service-token': 'mock_service_token' } };
        const res = { send: jest.fn(), header: jest.fn() };

        await controller.forceStart(req, res);
        expect(res.header).toHaveBeenCalledWith('Content-Type', 'text/csv');
        expect(res.send).toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty results', async () => {
        const req = { query: { format: 'csv' }, body: { keys: [], user: { role: 'OrgOwner' } }, headers: { 'x-service-token': 'mock_service_token' } };
        const res = { send: jest.fn(), header: jest.fn() };

        await expect(controller.forceStart(req, res)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
        const req = { query: { format: 'csv' }, body: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } }, headers: { 'x-service-token': 'invalid_token' } };
        const res = { send: jest.fn(), header: jest.fn() };

        await expect(controller.forceStart(req, res)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid user role', async () => {
        const req = { query: { format: 'csv' }, body: { keys: ['AVNZ-1'], user: { role: 'InvalidRole' } }, headers: { 'x-service-token': 'mock_service_token' } };
        const res = { send: jest.fn(), header: jest.fn() };

        await expect(controller.forceStart(req, res)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid JSON body', async () => {
        const req = { query: { format: 'csv' }, body: 'invalid_json', headers: { 'x-service-token': 'mock_service_token' } };
        const res = { send: jest.fn(), header: jest.fn() };

        await expect(controller.forceStart(req, res)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing user role', async () => {
        const req = { query: { format: 'csv' }, body: { keys: ['AVNZ-1'], user: { role: null } }, headers: { 'x-service-token': 'mock_service_token' } };
        const res = { send: jest.fn(), header: jest.fn() };

        await expect(controller.forceStart(req, res)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing keys', async () => {
        const req = { query: { format: 'csv' }, body: { user: { role: 'OrgOwner' } }, headers: { 'x-service-token': 'mock_service_token' } };
        const res = { send: jest.fn(), header: jest.fn() };

        await expect(controller.forceStart(req, res)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid key types', async () => {
        const req = { query: { format: 'csv' }, body: { keys: [123, true], user: { role: 'OrgOwner' } }, headers: { 'x-service-token': 'mock_service_token' } };
        const res = { send: jest.fn(), header: jest.fn() };

        await expect(controller.forceStart(req, res)).rejects.toThrow(BadRequestException);
    });
});