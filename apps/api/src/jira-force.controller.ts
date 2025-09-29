import { BadRequestException, Controller, Post, Req, Query, ForbiddenException } from '@nestjs/common';

@Controller('jira')
export class JiraController {
    async forceStart(@Req() req: any, @Query('format') format?: string) {
        if (!process.env.JIRA_DOMAIN) {
            throw new BadRequestException('JIRA_DOMAIN is required.');
        }
        if (!isAuthorized(req.user)) {
            throw new ForbiddenException('You do not have permission to access this resource.');
        }
        // existing logic
    }
}