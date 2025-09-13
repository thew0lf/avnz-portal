import type { Request } from 'express';
export declare class MembershipsController {
    list(req: Request & {
        auth?: any;
    }): Promise<{
        rows: any[];
    }>;
    add(req: Request & {
        auth?: any;
    }, body: any): Promise<{
        ok: boolean;
    }>;
}
