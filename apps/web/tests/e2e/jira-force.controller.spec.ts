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

    it('should throw BadRequestException for missing user object', async () => {
        await expect(controller.forceStart({ body: { keys: ['AVNZ-1'] } })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid keys format', async () => {
        await expect(controller.forceStart({ body: { keys: [123], user: { role: 'OrgOwner' } } })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing keys', async () => {
        await expect(controller.forceStart({ body: { keys: [], user: { role: 'OrgOwner' } } })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty string in keys', async () => {
        await expect(controller.forceStart({ body: { keys: [''], user: { role: 'OrgOwner' } } })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for large input boundary', async () => {
        await expect(controller.forceStart({ body: { keys: Array(1001).fill('AVNZ-1'), user: { role: 'OrgOwner' } } })).rejects.toThrow(BadRequestException);
    });

    it('should execute successfully with valid keys and user role', async () => {
        const response = await controller.forceStart({ body: { keys: ['AVNZ-1'], user: { role: 'OrgOwner' } } });
        expect(response).toBeDefined();
    });

    it('should throw ForbiddenException for invalid user role', async () => {
        await expect(controller.forceStart({ body: { keys: ['AVNZ-1'], user: { role: 'InvalidRole' } } })).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for missing req.body', async () => {
        await expect(controller.forceStart({ headers: { 'x-service-token': 'mock_service_token' } })).rejects.toThrow(BadRequestException);
    });
});