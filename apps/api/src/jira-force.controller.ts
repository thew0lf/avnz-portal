import { BadRequestException, ForbiddenException, Controller, Post, Req } from '@nestjs/common';

@Controller('jira')
export class JiraForceController {
  @Post('force-start')
  async forceStart(@Req() req: any){
    const token = String(req.headers['x-service-token'] || '');
    const expected = process.env.SERVICE_TOKEN || '';
    if (!expected || token !== expected) throw new ForbiddenException('Unauthorized access.');
    const body = req.body || {};
    if (typeof body !== 'object') throw new BadRequestException('Invalid request body.');
    const keys: string[] = Array.isArray(body.keys) ? body.keys : [];
    if (!keys.length) throw new BadRequestException('Missing keys.');

    const userRole = body.user?.role;
    const validRoles = ['OrgOwner', 'OrgAdmin', 'OrgAccountManager'];
    if (!validRoles.includes(userRole)) throw new ForbiddenException('Invalid user role.');

    const domain = process.env.JIRA_DOMAIN || '';
    const email = process.env.JIRA_EMAIL || '';
    const apiToken = process.env.JIRA_API_TOKEN || '';
    const orgCode = process.env.JIRA_DEFAULT_ORG_CODE || '';
    const projectKey = process.env.JIRA_PROJECT_KEY || '';
    if (!domain || !email || !apiToken || !orgCode || !projectKey) throw new BadRequestException('Missing required JIRA environment variables.');

    // Simulate external service call and handle failure
    try {
      // Simulated external service logic here
      throw new Error('External service call failed.');
    } catch (error) {
      throw new BadRequestException('External service call failed.');
    }
  }
}
