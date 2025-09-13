import type { Request } from 'express';
export declare class ProjectsController {
    mine(req: Request & {
        auth?: any;
    }): Promise<{
        rows: any;
    }>;
    list(req: Request & {
        auth?: any;
    }): Promise<{
        rows: any;
        limit: number;
        offset: number;
        q: string;
    }>;
    create(req: Request & {
        auth?: any;
    }, body: any): Promise<any>;
}
