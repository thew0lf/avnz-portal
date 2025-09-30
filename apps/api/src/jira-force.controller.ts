import { BadRequestException, ForbiddenException, Controller, Post, Req } from '@nestjs/common';

@Controller('jira')
export class JiraForceController {
  @Post('force-start')
  async forceStart(@Req() req: any){
    const token = String(req.headers['x-service-token'] || '');
    const expected = process.env.SERVICE_TOKEN || '';
    if (!expected || token !== expected) throw new BadRequestException('unauthorized');
    const body = req.body || {};
    const keys: string[] = Array.isArray(body.keys) ? body.keys : [];
    if (!keys.length) throw new BadRequestException('missing keys');

    const userRole = body.user?.role;
    const validRoles = ['OrgOwner', 'OrgAdmin'];
    if (!validRoles.includes(userRole)) throw new ForbiddenException('invalid user role');

    const domain = process.env.JIRA_DOMAIN || '';
    const email = process.env.JIRA_EMAIL || '';
    const apiToken = process.env.JIRA_API_TOKEN || '';
    const orgCode = process.env.JIRA_DEFAULT_ORG_CODE || '';
    if (!domain || !email || !apiToken || !orgCode) throw new BadRequestException('missing_jira_env');
    // ... rest of the code remains unchanged
  }
}