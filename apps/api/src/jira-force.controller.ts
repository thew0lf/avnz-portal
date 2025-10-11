import { BadRequestException, Controller, Post, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { pool } from './db.js';
import { getServiceConfig } from './service-config.js';
import { parse } from 'json2csv';

@Controller('jira')
export class JiraForceController {
  @Post('force-start')
  async forceStart(@Req() req: any, @Res() res: Response) {
    // ... existing code ...

    // After processing the data and before sending the response
    const results = []; // Assume this is populated with your data

    // Check for CSV format
    if (req.query.format === 'csv') {
      const csv = parse(results); // Convert results to CSV
      res.header('Content-Type', 'text/csv');
      return res.send(csv); // Send CSV response
    }

    // Default to JSON response
    return res.json({ success: true, data: results });
  }
}