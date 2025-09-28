import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthzService } from './authz.service.js'

export const AUTHZ_META_KEY = 'authz_meta'

export type AuthzMeta = {
  action: string
  domain: string
  resourceType: string
  resourceParam?: string
}

export function Authz(meta: AuthzMeta): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(AUTHZ_META_KEY, meta, descriptor.value!)
  }
}

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector, private authz: AuthzService) {}
  async canActivate(context: ExecutionContext) {
    // Bootstrap bypass (dev/local)
    if ((process.env.RBAC_BOOTSTRAP_MODE || '').toLowerCase()==='true' && (process.env.RBAC_BOOTSTRAP_ALLOW_ALL || '').toLowerCase()==='true') {
      return true
    }
    const handler = context.getHandler()
    const meta = this.reflector.get<AuthzMeta | undefined>(AUTHZ_META_KEY, handler)
    if (!meta) return true
    const req: any = context.switchToHttp().getRequest()
    const userId = req?.auth?.userId
    if (!userId) throw new ForbiddenException('unauthorized')
    // Portal Manager bypass: only users with 'portal-manager' get full access
    const legacyRoles: string[] = Array.isArray(req?.auth?.roles) ? req.auth.roles : []
    if (legacyRoles.includes('portal-manager')) {
      return true
    }
    const resourceId = req.params?.[meta.resourceParam || 'id'] || req.body?.[meta.resourceParam || 'id']
    if (!resourceId) throw new ForbiddenException('missing resource id')
    const result = await this.authz.isAllowed(userId, resourceId, meta.domain, meta.resourceType, meta.action)
    if (!result.allowed) throw new ForbiddenException('forbidden')
    return true
  }
}
