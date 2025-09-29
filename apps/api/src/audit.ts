import { pool } from './db.js'
import type { Request } from 'express'

export async function audit(req: Request & { auth?: any }, action: string, entity: string, entityId?: string, before?: any, after?: any) {
  try {
    const orgUUID: string | null = (req as any)?.auth?.orgUUID || null
    const userId: string | null = (req as any)?.auth?.userId || null
    const c = await pool.connect()
    try {
      await c.query(
        'insert into audit_log(org_id, user_id, action, entity, entity_id, before, after) values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)',
        [orgUUID || null, userId || null, action, entity, entityId || null, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null]
      )
    } finally { c.release() }
  } catch {}
}