import twilio from 'twilio'

export async function sendInviteSms(to: string, token: string, opts?: { shortCode?: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const auth = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM
  const base = process.env.INVITE_ACCEPT_URL_BASE || process.env.PUBLIC_BASE_URL || 'http://localhost:3000/accept'
  if (!sid || !auth || !from) { console.warn('SMS disabled: missing Twilio env'); return }
  const client = twilio(sid, auth)
  const url = `${base}?token=${encodeURIComponent(token)}`
  const body = `You're invited to join${opts?.shortCode?` (${opts.shortCode})`:''}. Accept: ${url}`
  await client.messages.create({ from, to, body })
}

