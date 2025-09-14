import { pool } from './db.js';
import { dec } from './crypto.util.js';
export async function getServiceConfig(orgId, clientId, service, name) {
    const c = await pool.connect();
    try {
        const args = [orgId, service, name];
        let sql = 'select value_enc from service_configs where org_id=$1 and service=$2 and name=$3 and ';
        if (clientId) {
            sql += 'client_id=$4';
            args.push(clientId);
        }
        else {
            sql += 'client_id is null';
        }
        const r = await c.query(sql, args);
        if (r.rows[0]?.value_enc) {
            try {
                return dec(r.rows[0].value_enc, process.env.AUTH_SECRET || 'dev-secret-change-me');
            }
            catch {
                return null;
            }
        }
        // fallback: default (no client) if we queried client-specific
        if (clientId) {
            const r2 = await c.query('select value_enc from service_configs where org_id=$1 and service=$2 and name=$3 and client_id is null limit 1', [orgId, service, name]);
            if (r2.rows[0]?.value_enc) {
                try {
                    return dec(r2.rows[0].value_enc, process.env.AUTH_SECRET || 'dev-secret-change-me');
                }
                catch {
                    return null;
                }
            }
        }
        return null;
    }
    finally {
        c.release();
    }
}
