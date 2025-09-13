import nodemailer from 'nodemailer'

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
  return {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'no-reply@localhost',
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

export async function sendInviteEmail(to: string, token: string, options?: { orgName?: string; clientName?: string }) {
  const t = getTransporter()
  if (!t) { console.log('Invite token (no SMTP):', token); return }
  const cfg = getConfig()
  const url = `${cfg.inviteBaseUrl}?token=${encodeURIComponent(token)}`
  const subject = `You're invited to join ${options?.clientName || 'a client'}${options?.orgName ? ' on ' + options.orgName : ''}`
  const text = `You've been invited to join ${options?.clientName || 'a client'}${options?.orgName ? ' on ' + options.orgName : ''}.
Use the link below to accept the invite and set your password:

${url}

If you did not expect this invite, you can ignore this email.`
  await t.sendMail({ from: cfg.from, to, subject, text })
}

