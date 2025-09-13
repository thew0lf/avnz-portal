import type { Request } from 'express';
export declare class RolesController {
    list(req: Request & {
        auth?: any;
    }): Promise<{
        rows: any;
    }>;
    create(req: Request & {
        auth?: any;
    }, body: any): Promise<any>;
    permissions(): Promise<{
        rows: any;
    }>;
    setPermissions(req: Request & {
        auth?: any;
    }, id: string, body: any): Promise<{
        ok: boolean;
        count: any;
    }>;
    members(req: Request & {
        auth?: any;
    }, id: string): Promise<{
        rows: any;
    }>;
    assign(req: Request & {
        auth?: any;
    }, id: string, body: any): Promise<{
        ok: boolean;
    }>;
}
