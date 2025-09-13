var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthzService } from './authz.service.js';
export const AUTHZ_META_KEY = 'authz_meta';
export function Authz(meta) {
    return (target, propertyKey, descriptor) => {
        Reflect.defineMetadata(AUTHZ_META_KEY, meta, descriptor.value);
    };
}
let RbacGuard = class RbacGuard {
    constructor(reflector, authz) {
        this.reflector = reflector;
        this.authz = authz;
    }
    async canActivate(context) {
        const handler = context.getHandler();
        const meta = this.reflector.get(AUTHZ_META_KEY, handler);
        if (!meta)
            return true;
        const req = context.switchToHttp().getRequest();
        const userId = req?.auth?.userId;
        if (!userId)
            throw new ForbiddenException('unauthorized');
        const resourceId = req.params?.[meta.resourceParam || 'id'] || req.body?.[meta.resourceParam || 'id'];
        if (!resourceId)
            throw new ForbiddenException('missing resource id');
        const result = await this.authz.isAllowed(userId, resourceId, meta.domain, meta.resourceType, meta.action);
        if (!result.allowed)
            throw new ForbiddenException('forbidden');
        return true;
    }
};
RbacGuard = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Reflector, AuthzService])
], RbacGuard);
export { RbacGuard };
