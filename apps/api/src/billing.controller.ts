import { Controller, Get, Req, BadRequestException, ForbiddenException, Param, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { getClientForReq } from './db.js'

type ReqX = Request & { auth?: { userId?: string; orgId?: string; orgUUID?: string; roles?: string[]; perms?: string[] } }

function requireBillingAccess(req: ReqX) {
  const roles = Array.isArray(req.auth?.roles) ? (req.auth!.roles as string[]) : []
  if (roles.includes('portal-manager')) return
  const perms = Array.isArray(req.auth?.perms) ? (req.auth!.perms as string[]) : []
  if (!perms.includes('admin') && !perms.includes('manage_projects') && !perms.includes('view_usage')) {
    throw new ForbiddenException('insufficient permissions')
  }
}

@Controller('billing')
export class BillingController {
  @Get('orders')
  async listOrders(@Req() req: ReqX, @Res({ passthrough: true }) res: Response) {
    const org = req.auth?.orgUUID || req.auth?.orgId
    if (!org) throw new BadRequestException('org required')
    requireBillingAccess(req)
    const url = new URL(req.url, 'http://local')
    const q = (url.searchParams.get('q') || '').trim().toLowerCase()
    const state = (url.searchParams.get('state') || '').trim().toLowerCase()
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || '20')))
    const offset = Math.max(0, Number(url.searchParams.get('offset') || '0'))
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const sort = (url.searchParams.get('sort') || 'created_at').toLowerCase()
    const dir = ((url.searchParams.get('dir') || 'desc').toLowerCase() === 'asc') ? 'asc' : 'desc'
    const client = await getClientForReq(req as any)
    try {
      const args: any[] = [org]
      let where = 'where o.org_id=$1'
      if (q) {
        args.push(`%${q}%`)
        where += ` and (lower(coalesce(o.order_number,'')) like $${args.length} or lower(coalesce(o.email,'')) like $${args.length})`
      }
      if (state) {
        args.push(state)
        where += ` and lower(coalesce(o.state,'')) = $${args.length}`
      }
      if (from) { args.push(from); where += ` and o.created_at >= $${args.length}` }
      if (to) { args.push(to); where += ` and o.created_at < $${args.length}` }
      const countSql = `select count(*)::int as count from billing_orders o ${where}`
      const { rows: countRows } = await client.query(countSql, args)
      const total = countRows[0]?.count || 0
      const sortCols: Record<string,string> = { created_at: 'o.created_at', order_number: 'o.order_number', total_amount: 'o.total_amount', state: 'o.state', email: 'o.email' }
      const sortSql = sortCols[sort] || 'o.created_at'
      const sql = `select o.id, o.order_number, o.state, o.total_amount, o.currency, o.email, o.customer_id, o.created_at
                   from billing_orders o ${where}
                   order by ${sortSql} ${dir}
                   limit ${limit} offset ${offset}`
      const { rows } = await client.query(sql, args)
      // dynamic states
      const optsArgs: any[] = [org]
      let optsWhere = "where org_id=$1 and state is not null and state <> ''"
      if (from) { optsArgs.push(from); optsWhere += ` and created_at >= $${optsArgs.length}` }
      if (to) { optsArgs.push(to); optsWhere += ` and created_at < $${optsArgs.length}` }
      const statesRes = await client.query(`select distinct lower(state) as state from billing_orders ${optsWhere} order by 1`, optsArgs)
      const states = statesRes.rows.map(r => r.state).filter(Boolean)
      if ((url.searchParams.get('format') || '').toLowerCase() === 'csv') {
        res.setHeader('content-type', 'text/csv; charset=utf-8')
        const header = ['id','order_number','state','total_amount','currency','email','customer_id','created_at']
        const lines = [header.join(',')]
        for (const r of rows) {
          lines.push([
            r.id, r.order_number, r.state, r.total_amount, r.currency, r.email, r.customer_id, r.created_at?.toISOString?.() || r.created_at
          ].map(v => (v==null? '' : String(v).includes(',') ? '"'+String(v).replace(/"/g,'""')+'"' : String(v))).join(','))
        }
        return lines.join('\n')
      }
      return { rows, limit, offset, q, state, total, sort, dir, options: { states } }
    } finally { client.release() }
  }

  @Get('customers')
  async listCustomers(@Req() req: ReqX, @Res({ passthrough: true }) res: Response) {
    const org = req.auth?.orgUUID || req.auth?.orgId
    if (!org) throw new BadRequestException('org required')
    requireBillingAccess(req)
    const url = new URL(req.url, 'http://local')
    const q = (url.searchParams.get('q') || '').trim().toLowerCase()
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || '20')))
    const offset = Math.max(0, Number(url.searchParams.get('offset') || '0'))
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const sort = (url.searchParams.get('sort') || 'created_at').toLowerCase()
    const dir = ((url.searchParams.get('dir') || 'desc').toLowerCase() === 'asc') ? 'asc' : 'desc'
    const client = await getClientForReq(req as any)
    try {
      const args: any[] = [org]
      let where = 'where org_id=$1'
      if (q) {
        args.push(`%${q}%`)
        where += ` and (lower(coalesce(email,'')) like $${args.length} or lower(coalesce(first_name,'')) like $${args.length} or lower(coalesce(last_name,'')) like $${args.length})`
      }
      if (from) { args.push(from); where += ` and created_at >= $${args.length}` }
      if (to) { args.push(to); where += ` and created_at < $${args.length}` }
      const countSql = `select count(*)::int as count from billing_customers ${where}`
      const { rows: countRows } = await client.query(countSql, args)
      const total = countRows[0]?.count || 0
      const sortCols: Record<string,string> = { created_at: 'created_at', email: 'email', first_name: 'first_name', last_name: 'last_name' }
      const sortSql = sortCols[sort] || 'created_at'
      const sql = `select id, first_name, last_name, email, created_at from billing_customers ${where} order by ${sortSql} ${dir} limit ${limit} offset ${offset}`
      const { rows } = await client.query(sql, args)
      if ((url.searchParams.get('format') || '').toLowerCase() === 'csv') {
        res.setHeader('content-type', 'text/csv; charset=utf-8')
        const header = ['id','first_name','last_name','email','created_at']
        const lines = [header.join(',')]
        for (const r of rows) {
          lines.push([
            r.id, r.first_name, r.last_name, r.email, r.created_at?.toISOString?.() || r.created_at
          ].map(v => (v==null? '' : String(v).includes(',') ? '"'+String(v).replace(/"/g,'""')+'"' : String(v))).join(','))
        }
        return lines.join('\n')
      }
      return { rows, limit, offset, q, total, sort, dir }
    } finally { client.release() }
  }

  @Get('transactions')
  async listTransactions(@Req() req: ReqX, @Res({ passthrough: true }) res: Response) {
    const org = req.auth?.orgUUID || req.auth?.orgId
    if (!org) throw new BadRequestException('org required')
    requireBillingAccess(req)
    const url = new URL(req.url, 'http://local')
    const q = (url.searchParams.get('q') || '').trim().toLowerCase()
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || '20')))
    const offset = Math.max(0, Number(url.searchParams.get('offset') || '0'))
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const sort = (url.searchParams.get('sort') || 'created_at').toLowerCase()
    const dir = ((url.searchParams.get('dir') || 'desc').toLowerCase() === 'asc') ? 'asc' : 'desc'
    const client = await getClientForReq(req as any)
    try {
      const args: any[] = [org]
      let where = 'where t.org_id=$1'
      if (q) {
        args.push(`%${q}%`)
        where += ` and (lower(coalesce(t.processor,'')) like $${args.length} or lower(coalesce(t.response_code,'')) like $${args.length})`
      }
      const processor = (url.searchParams.get('processor') || '').trim().toLowerCase()
      if (processor) { args.push(processor); where += ` and lower(coalesce(t.processor,'')) = $${args.length}` }
      if (from) { args.push(from); where += ` and t.created_at >= $${args.length}` }
      if (to) { args.push(to); where += ` and t.created_at < $${args.length}` }
      const countSql = `select count(*)::int as count from billing_transactions t ${where}`
      const { rows: countRows } = await client.query(countSql, args)
      const total = countRows[0]?.count || 0
      const sortCols: Record<string,string> = { created_at: 't.created_at', amount: 't.amount', processor: 't.processor', state: 't.state', response_code: 't.response_code' }
      const sortSql = sortCols[sort] || 't.created_at'
      const sql = `select t.id, t.order_id, t.state, t.amount, t.currency, t.processor, t.response_code, t.created_at from billing_transactions t ${where} order by ${sortSql} ${dir} limit ${limit} offset ${offset}`
      const { rows } = await client.query(sql, args)
      // dynamic processors
      const optsArgs: any[] = [org]
      let optsWhere = "where org_id=$1 and processor is not null and processor <> ''"
      if (from) { optsArgs.push(from); optsWhere += ` and created_at >= $${optsArgs.length}` }
      if (to) { optsArgs.push(to); optsWhere += ` and created_at < $${optsArgs.length}` }
      const procRes = await client.query(`select distinct lower(processor) as processor from billing_transactions ${optsWhere} order by 1`, optsArgs)
      const processors = procRes.rows.map(r => r.processor).filter(Boolean)
      if ((url.searchParams.get('format') || '').toLowerCase() === 'csv') {
        res.setHeader('content-type', 'text/csv; charset=utf-8')
        const header = ['id','order_id','state','amount','currency','processor','response_code','created_at']
        const lines = [header.join(',')]
        for (const r of rows) {
          lines.push([
            r.id, r.order_id, r.state, r.amount, r.currency, r.processor, r.response_code, r.created_at?.toISOString?.() || r.created_at
          ].map(v => (v==null? '' : String(v).includes(',') ? '"'+String(v).replace(/"/g,'""')+'"' : String(v))).join(','))
        }
        return lines.join('\n')
      }
      return { rows, limit, offset, q, total, sort, dir, options: { processors } }
    } finally { client.release() }
  }

  @Get('orders/:id')
  async getOrder(@Req() req: ReqX, @Param('id') id: string) {
    const org = req.auth?.orgUUID || req.auth?.orgId
    if (!org) throw new BadRequestException('org required')
    requireBillingAccess(req)
    const client = await getClientForReq(req as any)
    try {
      const order = await client.query(
        `select * from billing_orders where id=$1 and org_id=$2`,
        [id, org]
      )
      const o = order.rows[0]
      if (!o) throw new BadRequestException('order not found')
      const [items, txns, tracks] = await Promise.all([
        client.query(`select * from billing_order_items where order_id=$1 and org_id=$2 and deleted_at is null order by created_at asc`, [id, org]),
        client.query(`select * from billing_transactions where order_id=$1 and org_id=$2 and deleted_at is null order by created_at desc`, [id, org]),
        client.query(`select * from billing_tracking_numbers where order_id=$1 and org_id=$2 and deleted_at is null order by created_at asc`, [id, org]),
      ])
      let billingAddress: any = null
      let shippingAddress: any = null
      if (o.billing_address_id) {
        const r = await client.query(`select * from billing_addresses where id=$1 and org_id=$2`, [o.billing_address_id, org])
        billingAddress = r.rows[0] || null
      }
      if (o.shipping_address_id) {
        const r = await client.query(`select * from billing_addresses where id=$1 and org_id=$2`, [o.shipping_address_id, org])
        shippingAddress = r.rows[0] || null
      }
      // Fallback: addresses stored by order_id
      if (!billingAddress || !shippingAddress) {
        const r = await client.query(`select * from billing_addresses where order_id=$1 and org_id=$2`, [id, org])
        for (const a of r.rows) {
          if (!billingAddress && String(a.kind) === 'billing') billingAddress = a
          if (!shippingAddress && String(a.kind) === 'shipping') shippingAddress = a
        }
      }
      let customer: any = null
      if (o.customer_id) {
        const r = await client.query(`select id, first_name, last_name, email, created_at from billing_customers where id=$1 and org_id=$2`, [o.customer_id, org])
        customer = r.rows[0] || null
      }
      return {
        order: o,
        items: items.rows,
        transactions: txns.rows,
        tracking: tracks.rows,
        billingAddress,
        shippingAddress,
        customer,
      }
    } finally { client.release() }
  }
}
