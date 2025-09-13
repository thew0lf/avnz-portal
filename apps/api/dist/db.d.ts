import { Pool } from "pg";
export declare const pool: Pool;
export declare function withRls(userId: string | null, orgId: string | null, fn: (client: any) => Promise<any>): Promise<any>;
export declare function getClientForReq(req: {
    auth?: any;
}): Promise<any>;
