import type { Request } from 'express';
export declare class SpecController {
    bootstrapOrg(body: any, req?: any): Promise<{
        ok: boolean;
        orgNodeId: any;
        userId: any;
    }>;
    createClient(body: any, req?: any): Promise<{
        id: any;
        name: any;
        clientShortCode: string;
    }>;
    getClient(id: string): Promise<{
        id: string;
        name: any;
        clientShortCode: any;
    }>;
    invite(body: any, req?: any): Promise<{
        ok: boolean;
        shortCode: any;
        invite_token: string;
        expires: string;
    }>;
    acceptViaPath(short: string, token: string, body: any, req?: any): Promise<{
        ok: boolean;
    }>;
    capsMe(req: Request): Promise<{
        capabilities: {
            key: string;
            actions: any[];
        }[];
    }>;
    assignRole(body: any): Promise<any>;
    revokeRole(id: string): Promise<{
        ok: boolean;
    }>;
}
