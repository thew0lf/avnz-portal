import type { Request, Response, NextFunction } from 'express';
export declare function authMiddleware(req: Request & {
    auth?: any;
}, _res: Response, next: NextFunction): void;
