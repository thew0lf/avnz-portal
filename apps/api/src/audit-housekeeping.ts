import { pool } from './db.js'

export async function startAuditHousekeeping(){
  const hours = Number(process.env.AUDIT_HOUSEKEEPING_HOURS || 24)
  async function sweep(){
    try {
      const c = await pool.connect()
      try {
        const r = await c.query('select audit_retention_days from security_settings where id=1')
        const days = r.rows[0]?.audit_retention_days || 365
        await c.query('delete from audit_log where created_at < now() - ($1::text||\' days\')::interval', [String(days)])
      } finally { c.release() }
    } catch (e){ console.warn('Audit housekeeping failed', e) }
  }
  setInterval(sweep, hours * 3600 * 1000)
}
