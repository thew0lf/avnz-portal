import type { Request } from 'express';
export declare class ProjectMembersController {
    list(req: Request & {
        auth?: any;
    }, projectId?: string, projectCode?: string): Promise<{
        rows: any;
    }>;
    add(req: Request & {
        auth?: any;
    }, body: any): Promise<{
        ok: boolean;
    }>;
}
