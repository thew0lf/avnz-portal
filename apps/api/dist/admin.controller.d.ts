export declare class AdminController {
    getSec(_nodeId?: string): Promise<any>;
    setSec(b: any, _nodeId?: string): Promise<{
        ok: boolean;
    }>;
    listRoutes(_nodeId?: string, q?: string, limit?: string, offset?: string, includeDeleted?: string): Promise<{
        rows: any[];
        limit: number;
        offset: number;
        q: string;
        include_deleted: boolean;
    }>;
    createRoute(b: any, _nodeId?: string, req?: any): Promise<any>;
    deleteRoute(id: string, _nodeId?: string, req?: any): Promise<{
        ok: boolean;
    }>;
    restoreRoute(id: string, req?: any): Promise<{
        ok: boolean;
    }>;
    listEmailTemplates(key?: string, client_id?: string, includeDeleted?: string): Promise<{
        rows: any[];
        include_deleted: boolean;
    }>;
    upsertEmailTemplate(b: any, req?: any): Promise<any>;
    previewEmail(b: any, req?: any): Promise<{
        ok: boolean;
        from: string;
    }>;
    delEmailTemplate(id: string, req?: any): Promise<{
        ok: boolean;
    }>;
    restoreEmailTemplate(id: string, req?: any): Promise<{
        ok: boolean;
    }>;
    listSmsTemplates(key?: string, client_id?: string, includeDeleted?: string): Promise<{
        rows: any[];
        include_deleted: boolean;
    }>;
    upsertSmsTemplate(b: any, req?: any): Promise<any>;
    delSmsTemplate(id: string, req?: any): Promise<{
        ok: boolean;
    }>;
    restoreSmsTemplate(id: string, req?: any): Promise<{
        ok: boolean;
    }>;
    listServiceConfigs(nodeId?: string, service?: string, client_id?: string, includeDeleted?: string): Promise<{
        rows: any[];
        include_deleted: boolean;
    }>;
    upsertServiceConfig(b: any, nodeId?: string, req?: any): Promise<any>;
    delServiceConfig(id: string, req?: any): Promise<{
        ok: boolean;
    }>;
    restoreServiceConfig(id: string, req?: any): Promise<{
        ok: boolean;
    }>;
    getBudget(nodeId?: string): Promise<{
        monthly_limit_usd: any;
    }>;
    setBudget(nodeId?: string, b?: any): Promise<{
        ok: boolean;
    }>;
    listRoles(_nodeId?: string, q?: string, limit?: string, offset?: string, includeDeleted?: string): Promise<{
        rows: any[];
        limit: number;
        offset: number;
        q: string;
        include_deleted: boolean;
    }>;
    createRole(b: any, _nodeId?: string, _p?: any, _q?: any, _body2?: any, req?: any): Promise<any>;
    updateRole(id: string, b: any, _nodeId?: string, req?: any): Promise<any>;
    deleteRole(id: string, _nodeId?: string, req?: any): Promise<{
        ok: boolean;
    }>;
    restoreRole(id: string, req?: any): Promise<{
        ok: boolean;
    }>;
    listActions(_nodeId?: string, q?: string, limit?: string, offset?: string, includeDeleted?: string): Promise<{
        rows: any[];
        limit: number;
        offset: number;
        q: string;
        include_deleted: boolean;
    }>;
    createAction(b: any, _nodeId?: string, req?: any): Promise<any>;
    deleteAction(name: string, _nodeId?: string, req?: any): Promise<{
        ok: boolean;
    }>;
    restoreAction(name: string, req?: any): Promise<{
        ok: boolean;
    }>;
    listPerms(_nodeId?: string, q?: string, limit?: string, offset?: string, includeDeleted?: string): Promise<{
        rows: any[];
        limit: number;
        offset: number;
        q: string;
        include_deleted: boolean;
    }>;
    createPerm(b: any, _nodeId?: string, req?: any): Promise<any>;
    updatePerm(id: string, b: any, _nodeId?: string, req?: any): Promise<any>;
    deletePerm(id: string, _nodeId?: string, req?: any): Promise<{
        ok: boolean;
    }>;
    restorePerm(id: string, req?: any): Promise<{
        ok: boolean;
    }>;
    listAssignments(userId?: string, nodeId?: string, limit?: string, offset?: string, includeDeleted?: string): Promise<{
        rows: any[];
        limit: number;
        offset: number;
        include_deleted: boolean;
    }>;
    createAssignment(b: any, _nodeId?: string, req?: any): Promise<any>;
    deleteAssignment(id: string, _nodeId?: string, req?: any): Promise<{
        ok: boolean;
    }>;
    restoreAssignment(id: string, req?: any): Promise<{
        ok: boolean;
    }>;
    listAbac(_nodeId?: string, includeDeleted?: string): Promise<{
        rows: any[];
        include_deleted: boolean;
    }>;
    createAbac(b: any, _nodeId?: string, req?: any): Promise<any>;
    updateAbac(id: string, b: any, _nodeId?: string, req?: any): Promise<any>;
    deleteAbac(id: string, _nodeId?: string, req?: any): Promise<{
        ok: boolean;
    }>;
    restoreAbac(id: string, req?: any): Promise<{
        ok: boolean;
    }>;
}
