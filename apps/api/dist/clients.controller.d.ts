import type { Request } from 'express';
export declare class ClientsController {
    list(req: Request & {
        auth?: any;
    }): Promise<{
        rows: any[];
    }>;
    register(req: Request & {
        auth?: any;
    }, body: any): Promise<any>;
    selfRegister(body: any): Promise<{
        client: {
            id: any;
            code: any;
            name: any;
        };
        user: {
            id: any;
            email: any;
            username: any;
        };
        org: {
            id: any;
            code: any;
        };
    }>;
    invite(req: Request & {
        auth?: any;
    }, body: any): Promise<{
        ok: boolean;
        invite_token: string;
        expires: string;
        client: {
            id: any;
            code: any;
        };
    }>;
    me(req: Request & {
        auth?: any;
    }): Promise<any>;
    listInvites(req: Request & {
        auth?: any;
    }): Promise<{
        rows: any[];
    }>;
    revokeInvite(req: Request & {
        auth?: any;
    }): Promise<{
        ok: boolean;
    }>;
    setManager(req: Request & {
        auth?: any;
    }, body: any): Promise<{
        ok: boolean;
    }>;
}
