export declare class SpecAuthController {
    login(body: any): Promise<{
        error: string;
        accessToken?: undefined;
        refreshToken?: undefined;
        capabilities?: undefined;
    } | {
        accessToken: string;
        refreshToken: string;
        capabilities: {
            key: string;
            actions: string[];
        }[];
        error?: undefined;
    }>;
}
