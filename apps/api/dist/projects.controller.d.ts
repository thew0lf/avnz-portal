import type { Request } from 'express';
export declare class ProjectsController {
    mine(req: Request & {
        auth?: any;
    }): Promise<{
        rows: any[];
    }>;
    list(req: Request & {
        auth?: any;
    }): Promise<{
        rows: any[];
    }>;
    create(req: Request & {
        auth?: any;
    }, body: any): Promise<any>;
}
