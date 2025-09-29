import { BadRequestException, Controller, Get, Post, Query, Req, Param, ForbiddenException } from '@nestjs/common';

@Controller('jira')
export class JiraController {
    async forceStart(@Req() req: any, @Query('format') format?: string) {
        if (!isAuthorized(req.user)) {
            throw new ForbiddenException('You do not have permission to access this resource.');
        }
        // existing logic
    }
}