var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
import { pool } from '../db.js';
import { RBAC_CHECK_SQL } from '../db/rbac.sql.js';
import { evalJsonLogic } from './abac.js';
import { permCache } from './permissions.cache.js';
let AuthzService = class AuthzService {
    async isAllowed(userId, resourceNodeId, domain, resourceType, actionName, reqAttrs) {
        // Bootstrap bypass
        if ((process.env.RBAC_BOOTSTRAP_MODE || '').toLowerCase() === 'true') {
            const ids = String(process.env.RBAC_BOOTSTRAP_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
            if (ids.includes(String(userId)))
                return { allowed: true, userLevel: 9999, requiredLevel: 0, abac: { evaluated: false } };
        }
        const cacheKey = `${userId}:${resourceNodeId}:${domain}:${resourceType}:${actionName}`;
        const cached = permCache.get(cacheKey);
        if (cached)
            return cached;
        const client = await pool.connect();
        try {
            const r = await client.query(RBAC_CHECK_SQL, [resourceNodeId, userId, domain, resourceType, actionName]);
            const row = r.rows[0];
            if (!row) {
                const res = { allowed: false, userLevel: null, requiredLevel: null, abac: { evaluated: false } };
                permCache.set(cacheKey, res);
                return res;
            }
            const basePass = !!row.rbac_pass;
            if (!basePass) {
                const res = { allowed: false, userLevel: row.user_level, requiredLevel: row.required_level, abac: { evaluated: false } };
                permCache.set(cacheKey, res);
                return res;
            }
            // ABAC fence by action (optional)
            let abacEval = { evaluated: false, result: undefined };
            const f = await client.query('select expr from authz.abac_fences where action_name=$1 limit 1', [actionName]);
            if (f.rows[0]) {
                abacEval.evaluated = true;
                try {
                    const ok = !!evalJsonLogic(f.rows[0].expr, { user: { id: userId }, req: reqAttrs || {} });
                    abacEval.result = ok;
                    const res = { allowed: ok, userLevel: row.user_level, requiredLevel: row.required_level, abac: abacEval };
                    permCache.set(cacheKey, res);
                    return res;
                }
                catch {
                    const res = { allowed: false, userLevel: row.user_level, requiredLevel: row.required_level, abac: abacEval };
                    permCache.set(cacheKey, res);
                    return res;
                }
            }
            const res = { allowed: true, userLevel: row.user_level, requiredLevel: row.required_level, abac: abacEval };
            permCache.set(cacheKey, res);
            return res;
        }
        finally {
            client.release();
        }
    }
};
AuthzService = __decorate([
    Injectable()
], AuthzService);
export { AuthzService };
