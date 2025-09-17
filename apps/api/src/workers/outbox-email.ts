import { pool } from '../db.js'
import { sendPasswordResetEmail } from '../mailer.js'

type OutboxRow = {
  id: string
  type: string
  org_id: string | null
  client_id: string | null
  to_email: string
  template_key: string | null
  vars: any
  attempts: number
}

function backoffSeconds(attempts: number): number {
  const base = Math.min(60 * 15, Math.pow(2, Math.max(0, attempts)) * 30) // 30s, 60s, 120s ... cap 15m
  const jitter = Math.floor(Math.random() * 15)
  return base + jitter
}

export async function processOutboxOnce(limit = 10) {
  const c = await pool.connect()
  try {
    const { rows } = await c.query<OutboxRow>(
      `select id, type, org_id, client_id, to_email, template_key, vars, attempts
         from outbox_emails 
        where status='pending' and next_attempt_at <= now()
        order by created_at asc
        limit $1`,
      [limit]
    )
    for (const row of rows) {
      try {
        await c.query('update outbox_emails set status=$2 where id=$1 and status=$3', [row.id, 'processing', 'pending'])
        if (row.type === 'email.password_reset') {
          const token = row.vars?.token
          if (!token) throw new Error('missing token in vars')
          const orgId: string | undefined = row.org_id ?? undefined
          const clientId: string | undefined = row.client_id ?? undefined
          await sendPasswordResetEmail(row.to_email, String(token), { orgId, clientId })
        } else {
          throw new Error(`unsupported outbox type: ${row.type}`)
        }
        await c.query('update outbox_emails set status=$2, sent_at=now() where id=$1', [row.id, 'sent'])
      } catch (err: any) {
        const attempts = (row.attempts || 0) + 1
        const delay = backoffSeconds(attempts)
        await c.query("update outbox_emails set status=$2, attempts=$3, last_error=$4, next_attempt_at=now()+ ($5||' seconds')::interval where id=$1", [row.id, 'pending', attempts, String(err?.message || err), String(delay)])
      }
    }
  } finally {
    c.release()
  }
}

if (process.argv[1] && process.argv[1].includes('outbox-email')) {
  processOutboxOnce(20).then(() => {
    console.log('Outbox processed')
    process.exit(0)
  }).catch((e) => { console.error('Outbox processing failed', e); process.exit(1) })
}
