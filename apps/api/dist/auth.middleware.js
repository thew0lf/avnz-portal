import { parse } from 'cookie';
import { verifyToken } from './auth.util.js';
export function authMiddleware(req, _res, next) {
    const secret = process.env.AUTH_SECRET || 'dev-secret-change-me';
    let token;
    const auth = req.headers['authorization'];
    if (auth && typeof auth === 'string' && auth.startsWith('Bearer '))
        token = auth.slice(7);
    if (!token && typeof req.headers.cookie === 'string') {
        const cookies = parse(req.headers.cookie);
        token = cookies['session'];
    }
    if (token) {
        const payload = verifyToken(token, secret);
        if (payload)
            req.auth = { userId: payload.userId, orgId: payload.orgId, roles: payload.roles, email: payload.email, orgUUID: payload.orgUUID, clientCode: payload.clientCode, clientId: payload.clientId, perms: payload.perms || [] };
    }
    next();
}
