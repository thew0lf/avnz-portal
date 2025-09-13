var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Post, Body } from '@nestjs/common';
import { AuthzService } from '../authz/authz.service.js';
let CheckController = class CheckController {
    constructor(authz) {
        this.authz = authz;
    }
    async check(body) {
        const { userId, resourceNodeId, domain, resourceType, actionName, reqAttrs } = body || {};
        const res = await this.authz.isAllowed(userId, resourceNodeId, domain, resourceType, actionName, reqAttrs);
        return res;
    }
};
__decorate([
    Post('check'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CheckController.prototype, "check", null);
CheckController = __decorate([
    Controller('authz'),
    __metadata("design:paramtypes", [AuthzService])
], CheckController);
export { CheckController };
