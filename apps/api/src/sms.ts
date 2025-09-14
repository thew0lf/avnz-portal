import twilio from 'twilio'
import { pool } from './db.js'
import { getServiceConfig } from './service-config.js'
import { unitPrice } from './pricing.util.js'

export async function sendInviteSms(to: string, token: string, opts?: { shortCode?: string; clientName?: string; clientId?: string; orgId?: string }) {
  let sid = process.env.TWILIO_ACCOUNT_SID
  let auth = process.env.TWILIO_AUTH_TOKEN
  let from = process.env.TWILIO_FROM
  if (opts?.orgId) {
    sid = (await getServiceConfig(opts.orgId, opts.clientId||null, 'twilio', 'account_sid')) || sid
    auth = (await getServiceConfig(opts.orgId, opts.clientId||null, 'twilio', 'auth_token')) || auth
    from = (await getServiceConfig(opts.orgId, opts.clientId||null, 'twilio', 'from')) || from
  }
  const base = process.env.INVITE_ACCEPT_URL_BASE || process.env.PUBLIC_BASE_URL || 'http://localhost:3000/accept'
  if (!sid || !auth || !from) { console.warn('SMS disabled: missing Twilio env'); return }
  const client = twilio(sid, auth)
  const url = `${base}?token=${encodeURIComponent(token)}`
  const clientName = opts?.clientName || (opts?.shortCode ? `client ${opts.shortCode}` : 'our service')
  // Load template from DB
  const c = await pool.connect()
  let tmpl = ''
  try {
    const args:any[]=[]
    let sql = `select body from sms_templates where key='invite' and (client_id is null`
    if (opts?.clientId) { sql += ` or client_id=$1`; args.push(opts.clientId) }
    sql += `) order by (client_id is null) limit 1`
    const r = await c.query(sql, args)
    tmpl = r.rows[0]?.body || `You're invited to join {{clientName}}. Accept: {{url}}`
  } finally { c.release() }
  const vars: Record<string,string> = { url, clientName, shortCode: opts?.shortCode || '' }
  const render = (s:string)=> s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m,k)=> vars[k] ?? '')
  const body = render(tmpl)
  await client.messages.create({ from, to, body })
  // Track usage + cost event (sms send)
  try { if (opts?.orgId) { const unit = await unitPrice('twilio','sms','embed_tokens',opts.orgId, undefined, []); const cost = unit * (1000/1000); const c2=await pool.connect(); try{ await c2.query('insert into usage_events(org_id, provider, model, operation, embed_tokens, cost_usd) values ($1,$2,$3,$4,$5,$6)', [opts.orgId, 'twilio', 'sms', 'send', 1000, cost]); } finally { c2.release() } } } catch {}
}
