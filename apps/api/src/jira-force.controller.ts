import { BadRequestException, ForbiddenException, Controller, Post, Req } from '@nestjs/common';

@Controller('jira')
export class JiraForceController {
  @Post('force-start')
  async forceStart(@Req() req: any){
    const token = String(req.headers['x-service-token'] || '');
    const expected = process.env.SERVICE_TOKEN || '';
    if (!expected || token !== expected) throw new ForbiddenException('Unauthorized access. Please check your service token.');
    const body = req.body || {};
    const keys: string[] = Array.isArray(body.keys) ? body.keys : [];
    if (!keys.length) throw new BadRequestException('Missing keys. Please provide valid keys.');

    const userRole = body.user?.role;
    const validRoles = ['OrgOwner', 'OrgAdmin', 'OrgAccountManager'];
    if (!validRoles.includes(userRole)) throw new ForbiddenException('Invalid user role.');

    const domain = process.env.JIRA_DOMAIN || '';
    const email = process.env.JIRA_EMAIL || '';
    const apiToken = process.env.JIRA_API_TOKEN || '';
    const orgCode = process.env.JIRA_DEFAULT_ORG_CODE || '';
    const projectKey = process.env.JIRA_PROJECT_KEY || '';
    if (!domain || !email || !apiToken || !orgCode || !projectKey) {
      const missingVars = [];
      if (!domain) missingVars.push('JIRA_DOMAIN');
      if (!email) missingVars.push('JIRA_EMAIL');
      if (!apiToken) missingVars.push('JIRA_API_TOKEN');
      if (!orgCode) missingVars.push('JIRA_DEFAULT_ORG_CODE');
      if (!projectKey) missingVars.push('JIRA_PROJECT_KEY');
      throw new BadRequestException(`Missing required JIRA environment variables: ${missingVars.join(', ')}.`);
    }
    // Simulate external service call and handle failure
    // ... rest of the code remains unchanged
  }
}