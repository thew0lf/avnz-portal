import type { Request, Response, NextFunction } from 'express';
export declare function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
