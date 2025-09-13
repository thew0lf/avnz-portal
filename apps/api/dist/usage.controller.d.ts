import type { Request } from "express";
type ReqX = Request & {
    auth?: {
        userId?: string;
        orgId?: string;
        orgUUID?: string;
        roles?: string[];
    };
};
export declare class UsageController {
    summary(req: ReqX, from?: string, to?: string, by?: string, userId?: string, projectId?: string, projectCode?: string): Promise<{
        from: string;
        to: string;
        groupBy: string[];
        rows: any;
    }>;
    addEvent(req: ReqX, body: any): Promise<{
        ok: boolean;
    }>;
}
export {};
