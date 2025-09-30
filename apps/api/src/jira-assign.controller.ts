import { BadRequestException, Controller, Post, Req } from '@nestjs/common';

@Controller('jira')
export class JiraAssignController {
  @Post('assign-dev')
  async assignDev(@Req() req: any){
    const token = String(req.headers['x-service-token'] || '');
    const expected = process.env.SERVICE_TOKEN || '';
    if (!expected || token !== expected) throw new BadRequestException('Unauthorized access. Please check your service token.');

    const domain = process.env.JIRA_DOMAIN || '';
    const email = process.env.JIRA_EMAIL || '';
    const apiToken = process.env.JIRA_API_TOKEN || '';
    const orgCode = process.env.JIRA_DEFAULT_ORG_CODE || '';
    if (!domain || !email || !apiToken || !orgCode) throw new BadRequestException('Missing required JIRA environment variables.');
    const body = req.body || {};
    const keys: string[] = Array.isArray(body.keys) ? body.keys : [];
    if (!keys.length) throw new BadRequestException('Missing keys. Please provide valid keys.');
    // ... rest of the code remains unchanged
  }
}