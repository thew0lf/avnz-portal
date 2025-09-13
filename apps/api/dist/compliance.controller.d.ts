import type { Request } from "express";
type ReqX = Request & {
    auth?: {
        userId: string;
        orgId: string;
    };
};
export declare class ComplianceController {
    redactions(req: ReqX, nodeType: string, nodeId: string): Promise<any>;
    doc(req: ReqX, documentId: string): Promise<any>;
    exportCsv(req: ReqX, nodeType: string, nodeId: string, res: any): Promise<any>;
    docCsv(req: ReqX, documentId: string, res: any): Promise<any>;
}
export {};
