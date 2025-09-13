export declare class AuthController {
    mfaSetup(body: any): Promise<{
        secret: string;
        otpauth: string;
    }>;
    mfaEnable(body: any): Promise<{
        ok: boolean;
    }>;
    mfaVerify(body: any): Promise<{
        ok: boolean;
    }>;
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
        requires_mfa: boolean;
        user_id: any;
        token?: undefined;
        refresh_token?: undefined;
        refresh_expires?: undefined;
        user?: undefined;
    } | {
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
        requires_mfa?: undefined;
        user_id?: undefined;
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
