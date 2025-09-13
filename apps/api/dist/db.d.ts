import { Pool } from "pg";
export declare const pool: Pool;
export declare function withRls(userId: string | null, orgId: string | null, fn: (client: any) => Promise<any>): Promise<any>;
