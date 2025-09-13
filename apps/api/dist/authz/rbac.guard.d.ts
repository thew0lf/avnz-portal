import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthzService } from './authz.service.js';
export declare const AUTHZ_META_KEY = "authz_meta";
export type AuthzMeta = {
    action: string;
    domain: string;
    resourceType: string;
    resourceParam?: string;
};
export declare function Authz(meta: AuthzMeta): MethodDecorator;
export declare class RbacGuard implements CanActivate {
    private reflector;
    private authz;
    constructor(reflector: Reflector, authz: AuthzService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
