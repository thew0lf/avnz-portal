import { BadRequestException, ForbiddenException, Controller, Get, Post, Query, Req, Param } from '@nestjs/common'
import crypto from 'node:crypto'
import { pool } from './db.js'
import { getServiceConfig } from './service-config.js'
// Admin list uses role/perm check akin to BillingController

function timingSafeEqual(a: string, b: string){
  try {
    const ab = Buffer.from(a, 'utf8'); const bb = Buffer.from(b, 'utf8');
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb)
  } catch { return false }
}

@Controller('slack')
export class SlackController {
  // Slack Events endpoint: set request URL to /slack/events/:orgCode in your Slack app (ngrok public base)
  @Post('events/:orgCode')
  async handleEvent(@Param('orgCode') orgCode: string, @Req() req: any){
    const raw = req?.rawBody as Buffer | undefined
    if (!raw) throw new BadRequestException('missing raw body')
    const sig = String(req.headers['x-slack-signature']||'')
    const ts = String(req.headers['x-slack-request-timestamp']||'')
    if (!sig || !ts) throw new BadRequestException('missing signature')
    const bodyStr = raw.toString('utf8')
    const client = await pool.connect()
    try {
      // Resolve org UUID from orgCode
      const org = await client.query('select id from organizations where lower(code)=lower($1) limit 1', [String(orgCode)])
      const orgId: string | undefined = org.rows[0]?.id
      if (!orgId) throw new BadRequestException('unknown org')

      // Get Slack signing secret from service configs (org default)
      const secret = await getServiceConfig(orgId, null, 'slack', 'signing_secret')
      if (!secret) throw new BadRequestException('slack signing_secret not configured for org')
      // Verify timestamp freshness (5 minutes)
      const now = Math.floor(Date.now()/1000)
      if (Math.abs(now - Number(ts||'0')) > 60*5) throw new BadRequestException('stale request')
      // Verify signature
      const base = `v0:${ts}:${bodyStr}`
      const h = crypto.createHmac('sha256', secret).update(base).digest('hex')
      const expected = `v0=${h}`
      if (!timingSafeEqual(expected, sig)) throw new BadRequestException('invalid signature')

      let payload: any
      try { payload = JSON.parse(bodyStr) } catch { payload = {} }
      // Challenge response (url_verification)
      if (payload?.type === 'url_verification' && payload?.challenge) {
        return { challenge: payload.challenge }
      }

      // Event callback: persist basic fields + full payload
      if (payload?.type === 'event_callback'){
        const ev = payload.event || {}
        const team_id = payload.team_id || payload.authorizations?.[0]?.team_id || null
        const channel_id = ev.channel || ev.channel_id || null
        const user_id = ev.user || ev.user_id || null
        const event_type = ev.type || payload?.event?.type || null
        const text = ev.text || null
        const event_ts = ev.event_ts || payload.event_time || null
        await client.query(
          'insert into slack_events(org_id, client_id, team_id, channel_id, user_id, event_type, text, event_ts, payload) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [orgId, null, team_id, channel_id, user_id, event_type, text, event_ts? String(event_ts): null, JSON.stringify(payload)]
        )
      }
      return { ok: true }
    } finally { client.release() }
  }

  // Admin list endpoint
  @Get('events')
  async list(@Req() req:any, @Query('limit') limit?: string, @Query('offset') offset?: string){
    const orgUUID = req?.auth?.orgUUID
    if (!orgUUID) throw new BadRequestException('unauthorized')
    const roles: string[] = Array.isArray(req?.auth?.roles) ? req.auth.roles : []
    if (!(roles||[]).includes('portal-manager')) {
      const perms: string[] = Array.isArray(req?.auth?.perms) ? req.auth.perms : []
      if (!perms.includes('admin') && !perms.includes('manage_projects') && !perms.includes('view_usage')) {
        throw new ForbiddenException('insufficient permissions')
      }
    }
    const c = await pool.connect();
    try {
      const lim = Math.max(1, Math.min(200, Number(limit||'50')))
      const off = Math.max(0, Number(offset||'0'))
      const r = await c.query(
        `select id, team_id, channel_id, user_id, event_type, text, event_ts, created_at
           from slack_events
          where org_id=$1 and deleted_at is null
          order by created_at desc
          limit $2 offset $3`,
        [orgUUID, lim, off]
      )
      return { rows: r.rows, limit: lim, offset: off }
    } finally { c.release() }
  }
}
