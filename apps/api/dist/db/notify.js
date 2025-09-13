import { pool } from '../db.js';
import { permCache } from '../authz/permissions.cache.js';
let listening = false;
export async function startRbacNotifyListener() {
    if (listening)
        return;
    listening = true;
    try {
        const client = await pool.connect();
        await client.query('listen rbac_changed');
        client.on('notification', (msg) => {
            if (msg?.channel === 'rbac_changed') {
                permCache.clear();
                console.log('RBAC cache invalidated due to', msg.payload || 'change');
            }
        });
        client.on('error', () => { });
    }
    catch (e) {
        console.warn('RBAC notify listener failed', e);
    }
}
