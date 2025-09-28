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
    timeseries(req: ReqX, from?: string, to?: string, interval?: string, projectId?: string, projectCode?: string, clientId?: string, userId?: string): Promise<{
        rows: any;
    }>;
    summary(req: ReqX, from?: string, to?: string, by?: string, userId?: string, projectId?: string, projectCode?: string, clientId?: string): Promise<{
        from: string;
        to: string;
        groupBy: string[];
        rows: any;
    }>;
    addEvent(req: ReqX, body: any, svcToken?: string): Promise<{
        ok: boolean;
    }>;
}
export {};
