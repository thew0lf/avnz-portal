export declare class OrgsController {
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
}
