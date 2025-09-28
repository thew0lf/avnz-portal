export declare class OrgsController {
    mine(req: any): Promise<{
        rows: any[];
    }>;
    register(body: any): Promise<{
        token: string;
        refresh_token: string;
        refresh_expires: string;
        user: {
            id: any;
            email: any;
        };
        org: {
            id: any;
            code: any;
            name: any;
        };
    }>;
    update(req: any, body: any): Promise<{
        ok: boolean;
    }>;
    audit(req: any): Promise<{
        rows: any[];
        limit: number;
        offset: number;
    }>;
}
