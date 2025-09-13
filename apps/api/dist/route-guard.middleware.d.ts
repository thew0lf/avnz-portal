import type { Request, Response, NextFunction } from 'express';
export declare function routeGuardMiddleware(req: Request & {
    auth?: any;
}, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
