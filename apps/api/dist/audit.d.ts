import type { Request } from 'express';
export declare function audit(req: Request & {
    auth?: any;
}, action: string, entity: string, entityId?: string, before?: any, after?: any): Promise<void>;
