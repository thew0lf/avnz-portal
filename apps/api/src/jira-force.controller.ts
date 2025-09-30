import { BadRequestException, Controller, Post, Req, Query, ForbiddenException } from '@nestjs/common';

@Controller('jira')
export class JiraController {
    async forceStart(@Req() req: any, @Query('format') format?: string) {
        const requiredEnvVars = ['JIRA_DOMAIN', 'JIRA_EMAIL', 'JIRA_API_TOKEN', 'JIRA_PROJECT_KEY', 'JIRA_DEFAULT_ORG_CODE'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            const errorMessage = `${missingVars.join(', ')} are required.`;
            console.error(errorMessage);
            throw new BadRequestException(errorMessage);
        }
        if (!isAuthorized(req.user)) {
            throw new ForbiddenException('You do not have permission to access this resource.');
        }
        // existing logic
    }
}

function isAuthorized(user: any) {
    const validRoles = ['OrgOwner', 'OrgAdmin'];
    return user && user.role && validRoles.includes(user.role);
}