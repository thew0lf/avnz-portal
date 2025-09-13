export declare class AdminController {
    getSec(_nodeId?: string): Promise<any>;
    setSec(b: any, _nodeId?: string): Promise<{
        ok: boolean;
    }>;
    listRoutes(_nodeId?: string, q?: string, limit?: string, offset?: string): Promise<{
        rows: any[];
        limit: number;
        offset: number;
        q: string;
    }>;
    createRoute(b: any, _nodeId?: string, req?: any): Promise<any>;
    deleteRoute(id: string, _nodeId?: string, req?: any): Promise<{
        ok: boolean;
    }>;
    listRoles(_nodeId?: string, q?: string, limit?: string, offset?: string): Promise<{
        rows: any[];
        limit: number;
        offset: number;
        q: string;
    }>;
    createRole(b: any, _nodeId?: string, _p?: any, _q?: any, _body2?: any, req?: any): Promise<any>;
    updateRole(id: string, b: any, _nodeId?: string, req?: any): Promise<any>;
    deleteRole(id: string, _nodeId?: string, req?: any): Promise<{
        ok: boolean;
    }>;
    listActions(_nodeId?: string, q?: string, limit?: string, offset?: string): Promise<{
        rows: any[];
        limit: number;
        offset: number;
        q: string;
    }>;
    createAction(b: any, _nodeId?: string, req?: any): Promise<any>;
    deleteAction(name: string, _nodeId?: string, req?: any): Promise<{
        ok: boolean;
    }>;
    listPerms(_nodeId?: string, q?: string, limit?: string, offset?: string): Promise<{
        rows: any[];
        limit: number;
        offset: number;
        q: string;
    }>;
    createPerm(b: any, _nodeId?: string, req?: any): Promise<any>;
    updatePerm(id: string, b: any, _nodeId?: string, req?: any): Promise<any>;
    deletePerm(id: string, _nodeId?: string, req?: any): Promise<{
        ok: boolean;
    }>;
    listAssignments(userId?: string, nodeId?: string, limit?: string, offset?: string): Promise<{
        rows: any[];
        limit: number;
        offset: number;
    }>;
    createAssignment(b: any, _nodeId?: string, req?: any): Promise<any>;
    deleteAssignment(id: string, _nodeId?: string, req?: any): Promise<{
        ok: boolean;
    }>;
    listAbac(_nodeId?: string): Promise<{
        rows: any[];
    }>;
    createAbac(b: any, _nodeId?: string, req?: any): Promise<any>;
    updateAbac(id: string, b: any, _nodeId?: string, req?: any): Promise<any>;
    deleteAbac(id: string, _nodeId?: string, req?: any): Promise<{
        ok: boolean;
    }>;
}
