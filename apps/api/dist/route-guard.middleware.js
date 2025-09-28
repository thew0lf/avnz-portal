import { pool } from './db.js';
import { RBAC_CHECK_SQL } from './db/rbac.sql.js';
export async function routeGuardMiddleware(req, res, next) {
    // Bootstrap bypass for local/dev
    if ((process.env.RBAC_BOOTSTRAP_MODE || '').toLowerCase() === 'true' && (process.env.RBAC_BOOTSTRAP_ALLOW_ALL || '').toLowerCase() === 'true') {
        return next();
    }
    // Portal Manager bypass: only 'portal-manager' has full access
    const roles = Array.isArray(req?.auth?.roles) ? req.auth.roles : [];
    if (roles.includes('portal-manager')) {
        return next();
    }
    // Only enforce if route is in registry
    const method = String(req.method || '').toUpperCase();
    const path = req.path;
    let mapping = null;
    try {
        const c = await pool.connect();
        try {
            let r = await c.query('select method,path,domain,resource_type,action_name,resource_param from authz.route_registry where method=$1 and path=$2 limit 1', [method, path]);
            mapping = r.rows[0] || null;
            if (!mapping) {
                // try a simple parameterized fallback by replacing uuid/ids with :id
                const path2 = path.replace(/\/[0-9a-fA-F-]{8,}/g, '/:id').replace(/\/[0-9]{1,}/g, '/:id');
                if (path2 !== path) {
                    r = await c.query('select method,path,domain,resource_type,action_name,resource_param from authz.route_registry where method=$1 and path=$2 limit 1', [method, path2]);
                    mapping = r.rows[0] || null;
                }
            }
        }
        finally {
            c.release();
        }
    }
    catch { /* ignore; allow */ }
    if (!mapping)
        return next();
    const userId = req.auth?.userId;
    if (!userId)
        return res.status(401).json({ error: 'unauthorized' });
    const resourceParam = mapping.resource_param || 'id';
    let resourceNodeId = req.params?.[resourceParam] || req.body?.[resourceParam];
    // Org-scoped list endpoints: allow resolving node id from authenticated org when param missing
    if (!resourceNodeId && String(mapping.resource_type) === 'org') {
        const orgUUID = req?.auth?.orgUUID || req?.auth?.orgId;
        if (orgUUID)
            resourceNodeId = orgUUID;
    }
    if (!resourceNodeId)
        return res.status(400).json({ error: 'missing resource id' });
    try {
        const c = await pool.connect();
        try {
            const r = await c.query(RBAC_CHECK_SQL, [resourceNodeId, userId, mapping.domain, mapping.resource_type, mapping.action_name]);
            const row = r.rows[0];
            if (!row || !row.rbac_pass)
                return res.status(403).json({ error: 'forbidden' });
            return next();
        }
        finally {
            c.release();
        }
    }
    catch {
        return res.status(500).json({ error: 'authz failed' });
    }
}
