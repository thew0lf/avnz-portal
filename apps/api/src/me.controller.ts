import { Body, Controller, Get, Post, Req, BadRequestException } from '@nestjs/common'
import { getClientForReq, pool } from './db.js'

@Controller('me')
export class MeController {
  @Get('profile')
  async getProfile(@Req() req: any){
    const userId = req?.auth?.userId
    if (!userId) throw new BadRequestException('unauthorized')
    const c = await pool.connect(); try{
      const r = await c.query('select * from user_profiles where user_id=$1', [userId])
      return { profile: r.rows[0] || null }
    } finally { c.release() }
  }

  @Post('profile')
  async upsertProfile(@Req() req: any, @Body() body: any){
    const userId = req?.auth?.userId
    if (!userId) throw new BadRequestException('unauthorized')
    const {
      first_name, last_name, company, phone,
      address1, address2, city, state_province, postal_code, country
    } = body||{}
    const c = await pool.connect(); try{
      await c.query(
        `insert into user_profiles(user_id, first_name, last_name, company, phone, address1, address2, city, state_province, postal_code, country)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         on conflict (user_id) do update set
           first_name=excluded.first_name,
           last_name=excluded.last_name,
           company=excluded.company,
           phone=excluded.phone,
           address1=excluded.address1,
           address2=excluded.address2,
           city=excluded.city,
           state_province=excluded.state_province,
           postal_code=excluded.postal_code,
           country=excluded.country,
           updated_at=now()`,
        [userId, first_name, last_name, company, phone, address1, address2, city, state_province, postal_code, country]
      )
      return { ok: true }
    } finally { c.release() }
  }

  @Get('preferences')
  async getPrefs(@Req() req: any){
    const userId = req?.auth?.userId
    if (!userId) throw new BadRequestException('unauthorized')
    const c = await pool.connect(); try{
      const r = await c.query('select theme, color_scheme, timezone, language, email_notifications, sms_notifications, marketing_emails from user_preferences where user_id=$1', [userId])
      return { preferences: r.rows[0] || { theme:'system', color_scheme:'default' } }
    } finally { c.release() }
  }

  @Post('preferences')
  async upsertPrefs(@Req() req: any, @Body() body:any){
    const userId = req?.auth?.userId
    if (!userId) throw new BadRequestException('unauthorized')
    const { theme, color_scheme, timezone, language, email_notifications, sms_notifications, marketing_emails } = body||{}
    if (!['light','dark','system'].includes(String(theme||'system'))) throw new BadRequestException('invalid theme')
    const allowedSchemes = ['default','red','rose','orange','green','blue','yellow','violet']
    if (color_scheme && !allowedSchemes.includes(String(color_scheme))) throw new BadRequestException('invalid color_scheme')
    const c = await pool.connect(); try{
      await c.query(
        `insert into user_preferences(user_id, theme, color_scheme, timezone, language, email_notifications, sms_notifications, marketing_emails)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (user_id) do update set
           theme=excluded.theme,
           color_scheme=excluded.color_scheme,
           timezone=excluded.timezone,
           language=excluded.language,
           email_notifications=excluded.email_notifications,
           sms_notifications=excluded.sms_notifications,
           marketing_emails=excluded.marketing_emails,
           updated_at=now()`,
        [userId, theme||'system', color_scheme||'default', timezone, language, !!email_notifications, !!sms_notifications, !!marketing_emails]
      )
      return { ok:true }
    } finally { c.release() }
  }
}

