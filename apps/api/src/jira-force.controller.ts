import { BadRequestException, ForbiddenException, Controller, Post, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { parse } from 'json2csv';

@Controller('jira')
export class JiraForceController {
  @Post('force-start')
  async forceStart(@Req() req: any, @Res() res: Response) {
    const token = String(req.headers['x-service-token'] || '');
    const expected = process.env.SERVICE_TOKEN || '';
    if (!expected || token !== expected) throw new ForbiddenException('Unauthorized access.');
    const body = req.body || {};
    if (typeof body !== 'object') throw new BadRequestException('Invalid request body.');
    const keys: string[] = Array.isArray(body.keys) ? body.keys : [];
    if (!keys.length) throw new BadRequestException('Missing keys.');
    if (keys.some(key => key.trim() === '')) throw new BadRequestException('All keys must be strings.');

    const userRole = body.user?.role;
    const validRoles = ['OrgOwner', 'OrgAdmin', 'OrgAccountManager'];
    if (!userRole) throw new BadRequestException('User object is required.');
    if (!validRoles.includes(userRole)) throw new ForbiddenException('Invalid user role.');

    const results = []; // Assume this is populated with your data

    // Check for CSV format
    if (req.query.format === 'csv') {
      if (results.length === 0) throw new BadRequestException('No data available for CSV generation.');
      const csv = parse(results); // Convert results to CSV
      res.header('Content-Type', 'text/csv');
      return res.send(csv); // Send CSV response
    }

    // Default to JSON response
    return res.json({ success: true, data: results });
  }
}
