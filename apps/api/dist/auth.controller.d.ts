export declare class AuthController {
    register(body: any): Promise<{
        ok: boolean;
        user: {
            id: any;
            email: any;
            username: any;
        };
        client_code: any;
    }>;
    login(body: any): Promise<{
        token: string;
        refresh_token: string;
        refresh_expires: string;
        user: {
            id: any;
            org_id: any;
            client_id: any;
            client_code: any;
            email: any;
            username: any;
            roles: any[];
        };
    }>;
    acceptInvite(body: any): Promise<{
        ok: boolean;
        user: {
            id: any;
            email: any;
            username: any;
        };
        client_code: any;
    }>;
    refresh(body: any): Promise<{
        token: string;
    }>;
    requestReset(body: any): Promise<{
        ok: boolean;
        reset_token?: undefined;
        expires?: undefined;
    } | {
        ok: boolean;
        reset_token: string;
        expires: string;
    }>;
    reset(body: any): Promise<{
        ok: boolean;
    }>;
}
