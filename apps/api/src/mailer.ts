import nodemailer from 'nodemailer'
import sgMail from '@sendgrid/mail'
import { pool } from './db.js'
import { getServiceConfig } from './service-config.js'
import { unitPrice } from './pricing.util.js'

type MailConfig = {
  host?: string
  port?: number
  secure?: boolean
  user?: string
  pass?: string
  from?: string
  inviteBaseUrl?: string
}

function getConfig(): MailConfig {
  // Prefer explicit SMTP_* settings. If absent, support SendGrid via SMTP using SENDGRID_API_KEY.
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const smtpSecure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true'
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  let host = smtpHost
  let port = smtpPort
  let secure = smtpSecure
  let user = smtpUser
  let pass = smtpPass
  let from = process.env.SMTP_FROM || process.env.SENDGRID_FROM || 'no-reply@localhost'

  if (!host && process.env.SENDGRID_API_KEY) {
    // SendGrid SMTP bridge
    host = 'smtp.sendgrid.net'
    port = 587
    secure = false
    user = 'apikey'
    pass = process.env.SENDGRID_API_KEY
    if (!from) from = 'no-reply@example.com'
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    inviteBaseUrl: process.env.INVITE_ACCEPT_URL_BASE || process.env.PUBLIC_BASE_URL || 'http://localhost:3000/accept',
  }
}

let transporter: nodemailer.Transporter | null = null
function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter
  const cfg = getConfig()
  if (!cfg.host || !cfg.port) {
    console.warn('Mailer disabled: SMTP_HOST/SMTP_PORT not set')
    return null
  }
  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: !!cfg.secure,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
  })
  return transporter
}

export async function sendInviteEmail(to: string, token: string, options?: { orgName?: string; clientName?: string; clientId?: string; orgId?: string }) {
  const cfg = getConfig()
  const url = `${cfg.inviteBaseUrl}?token=${encodeURIComponent(token)}`
  const orgName = options?.orgName || ''
  const clientName = options?.clientName || 'a client'
  const orgNameSuffix = orgName ? ` on ${orgName}` : ''

  // Load template from DB (client override first, then default)
  const c = await pool.connect()
  let subject = ''
  let body = ''
  let body_html: string | undefined
  try {
    const args:any[] = []
    let sql = `select subject, body, body_html from email_templates where key='invite' and (client_id is null` 
    if (options?.clientId) { sql += ` or client_id=$1`; args.push(options.clientId) }
    sql += `) order by (client_id is null) limit 1`
    const r = await c.query(sql, args)
    const row = r.rows[0]
    subject = row?.subject || `You're invited to join ${clientName}${orgNameSuffix}`
    body = row?.body || `You've been invited to join ${clientName}${orgNameSuffix}.\nUse the link below to accept the invite and set your password:\n\n{{url}}\n\nIf you did not expect this invite, you can ignore this email.`
    body_html = row?.body_html || undefined
  } finally { c.release() }

  // Simple template rendering
  const vars: Record<string,string> = { url, orgName, clientName, orgNameSuffix }
  const render = (s:string)=> s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k)=> vars[k] ?? '')
  subject = render(subject)
  const html = body_html ? render(body_html) : undefined
  const text = render(body)
  // Get provider config from DB (SendGrid preferred)
  const dbFrom = options?.orgId ? await getServiceConfig(options.orgId, options?.clientId||null, 'sendgrid', 'from') : null
  if (dbFrom) cfg.from = dbFrom
  const sgKey = options?.orgId ? await getServiceConfig(options.orgId, options?.clientId||null, 'sendgrid', 'api_key') : null
  if (sgKey) process.env.SENDGRID_API_KEY = sgKey

  if (process.env.SENDGRID_API_KEY) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      await sgMail.send({ to, from: cfg.from, subject, text, html })
      // Track usage + cost
      try { const orgId = options?.orgId; if (orgId) { const unit = await unitPrice(process.env.SENDGRID_API_KEY? 'sendgrid':'smtp','email','embed_tokens',orgId, undefined, []); const cost = unit * (1000/1000); const clientU=await pool.connect(); try{ await clientU.query('insert into usage_events(org_id, provider, model, operation, embed_tokens, cost_usd) values ($1,$2,$3,$4,$5,$6)', [orgId, 'sendgrid', 'email', 'send', 1000, cost]); } finally { clientU.release() } } } catch {}
      return
    } catch (err) {
      console.warn('SendGrid send failed, falling back to SMTP:', err)
    }
  }
  const t = getTransporter()
  if (!t) { console.log('Invite token (no mail transport):', token); return }
  await t.sendMail({ from: cfg.from, to, subject, text, html })
  // Track usage event (email send)
  try {
    const orgId = options?.orgId
    if (orgId) { const unit = await unitPrice('smtp','email','embed_tokens',orgId, undefined, []); const cost = unit * (1000/1000); const client = await pool.connect(); try { await client.query('insert into usage_events(org_id, provider, model, operation, embed_tokens, cost_usd) values ($1,$2,$3,$4,$5,$6)', [orgId, 'smtp', 'email', 'send', 1000, cost]); } finally { client.release() } }
  } catch {}
}

export async function sendPasswordResetEmail(to: string, token: string, options?: { orgName?: string; clientName?: string; clientId?: string; orgId?: string }) {
  const publicBase = process.env.PUBLIC_BASE_URL || 'http://localhost:3000'
  const resetUrlBase = process.env.RESET_URL_BASE || `${publicBase.replace(/\/$/,'')}/reset`
  const url = `${resetUrlBase}?token=${encodeURIComponent(token)}`
  const orgName = options?.orgName || ''
  const clientName = options?.clientName || ''
  const orgNameSuffix = orgName ? ` on ${orgName}` : ''

  // Load template from DB (client override first, then default)
  const c = await pool.connect()
  let subject = ''
  let body = ''
  let body_html: string | undefined
  try {
    const args:any[] = []
    let sql = `select subject, body, body_html from email_templates where key='password_reset' and (client_id is null`
    if (options?.clientId) { sql += ` or client_id=$1`; args.push(options.clientId) }
    sql += `) order by (client_id is null) limit 1`
    const r = await c.query(sql, args)
    const row = r.rows[0]
    subject = row?.subject || `Reset your password${orgNameSuffix}`
    body = row?.body || `We received a request to reset your password${orgNameSuffix}.\nUse the link below to set a new password. This link expires in 60 minutes.\n\n{{url}}\n\nIf you did not request a password reset, you can safely ignore this email.`
    body_html = row?.body_html || undefined
  } finally { c.release() }

  const vars: Record<string,string> = { url, orgName, clientName, orgNameSuffix }
  const render = (s:string)=> s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k)=> vars[k] ?? '')
  subject = render(subject)
  const html = body_html ? render(body_html) : undefined
  const text = render(body)

  // Get provider config from DB (SendGrid preferred)
  const cfg = getConfig()
  const dbFrom = options?.orgId ? await getServiceConfig(options.orgId, options?.clientId||null, 'sendgrid', 'from') : null
  if (dbFrom) cfg.from = dbFrom
  const sgKey = options?.orgId ? await getServiceConfig(options.orgId, options?.clientId||null, 'sendgrid', 'api_key') : null
  if (sgKey) process.env.SENDGRID_API_KEY = sgKey

  if (process.env.SENDGRID_API_KEY) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      await sgMail.send({ to, from: cfg.from, subject, text, html })
      try { const orgId = options?.orgId; if (orgId) { const unit = await unitPrice('sendgrid','email','embed_tokens',orgId, undefined, []); const cost = unit * (1000/1000); const clientU=await pool.connect(); try{ await clientU.query('insert into usage_events(org_id, provider, model, operation, embed_tokens, cost_usd) values ($1,$2,$3,$4,$5,$6)', [orgId, 'sendgrid', 'email', 'send', 1000, cost]); } finally { clientU.release() } } } catch {}
      return
    } catch (err) {
      console.warn('SendGrid send failed, falling back to SMTP:', err)
    }
  }
  const t = getTransporter()
  if (!t) { console.log('Password reset token (no mail transport):', token); return }
  await t.sendMail({ from: cfg.from, to, subject, text, html })
  try { const orgId = options?.orgId; if (orgId) { const unit = await unitPrice('smtp','email','embed_tokens',orgId, undefined, []); const cost = unit * (1000/1000); const client=await pool.connect(); try{ await client.query('insert into usage_events(org_id, provider, model, operation, embed_tokens, cost_usd) values ($1,$2,$3,$4,$5,$6)', [orgId, 'smtp', 'email', 'send', 1000, cost]); } finally { client.release() } } } catch {}
}

export async function sendRawEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
  options?: { orgId?: string; clientId?: string }
): Promise<{ from: string }> {
  const cfg = getConfig()
  const dbFrom = options?.orgId ? await getServiceConfig(options.orgId, options?.clientId||null, 'sendgrid', 'from') : null
  if (dbFrom) cfg.from = dbFrom
  const sgKey = options?.orgId ? await getServiceConfig(options.orgId, options?.clientId||null, 'sendgrid', 'api_key') : null
  if (sgKey) process.env.SENDGRID_API_KEY = sgKey

  if (process.env.SENDGRID_API_KEY) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      await sgMail.send({ to, from: cfg.from, subject, text, html })
      try {
        const orgId = options?.orgId
        if (orgId) {
          const unit = await unitPrice('sendgrid','email','embed_tokens',orgId, undefined, [])
          const cost = unit * (1000/1000)
          const cU = await pool.connect(); try { await cU.query('insert into usage_events(org_id, provider, model, operation, embed_tokens, cost_usd) values ($1,$2,$3,$4,$5,$6)', [orgId, 'sendgrid','email','send',1000,cost]) } finally { cU.release() }
        }
      } catch {}
      return { from: cfg.from || '' }
    } catch (err) {
      console.warn('SendGrid send failed, falling back to SMTP:', err)
    }
  }
  const t = getTransporter()
  if (!t) { console.log('Preview send (no mail transport):', { to, subject }); return }
  await t.sendMail({ from: cfg.from, to, subject, text, html })
  try {
    const orgId = options?.orgId
    if (orgId) {
      const unit = await unitPrice('smtp','email','embed_tokens',orgId, undefined, [])
      const cost = unit * (1000/1000)
      const c = await pool.connect(); try { await c.query('insert into usage_events(org_id, provider, model, operation, embed_tokens, cost_usd) values ($1,$2,$3,$4,$5,$6)', [orgId, 'smtp','email','send',1000,cost]) } finally { c.release() }
    }
  } catch {}
  return { from: cfg.from || '' }
}
