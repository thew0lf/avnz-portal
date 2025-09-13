import { Controller, Post, Body } from '@nestjs/common'
import { AuthzService } from '../authz/authz.service.js'

@Controller('authz')
export class CheckController {
  constructor(private authz: AuthzService) {}
  @Post('check')
  async check(@Body() body: any){
    const { userId, resourceNodeId, domain, resourceType, actionName, reqAttrs } = body || {}
    const res = await this.authz.isAllowed(userId, resourceNodeId, domain, resourceType, actionName, reqAttrs)
    return res
  }
}

