import { Controller, Get, Post, Body, Query, Req, Headers, BadRequestException, ForbiddenException } from "@nestjs/common";
import type { Request } from "express";
import { pool, getClientForReq } from "./db.js";
import { unitPrice } from './pricing.util.js'
type ReqX = Request & { auth?: { userId?: string; orgId?: string; orgUUID?: string; roles?: string[] } };
function parseDate(s?: string, def?: Date) { if (!s) return def || new Date(Date.now()-7*24*3600*1000); const d=new Date(s); if(isNaN(d.getTime())) throw new BadRequestException("invalid date"); return d; }

@Controller("usage")
export class UsageController {
  @Get("timeseries")
  async timeseries(@Req() req: ReqX, @Query("from") from?: string, @Query("to") to?: string, @Query("interval") interval: string = 'day', @Query("projectId") projectId?: string, @Query("projectCode") projectCode?: string, @Query("clientId") clientId?: string, @Query("userId") userId?: string) {
    const ctx = req.auth; if (!ctx?.orgId) throw new BadRequestException("org required"); if(!Array.isArray((ctx as any).perms) || !((ctx as any).perms as string[]).includes('view_usage')) throw new ForbiddenException('view_usage required');
    const fromD = parseDate(from, new Date(Date.now()-30*24*3600*1000)); const toD = parseDate(to, new Date());
    const buckets = new Set(['day','week','month']); const bucket = buckets.has(interval) ? interval : 'day'
    const args:any[]=[ctx.orgUUID || ctx.orgId, fromD.toISOString(), toD.toISOString()];
    let where="where org_id=$1 and created_at >= $2 and created_at < $3";
    const perms = (ctx as any).perms || []
    // optional user filter
    if (userId) { args.push(userId); where += ` and user_id=$${args.length}` }
    let pid: string | null = null
    if (projectId) { pid = projectId; args.push(projectId); where += ` and project_id=$${args.length}`; }
    if (!pid && projectCode) {
      const client0 = await getClientForReq(req as any);
      try { const r = await client0.query('select p.id from projects p where p.org_id=$1 and p.code=$2', [ctx.orgUUID || ctx.orgId, projectCode]); if (r.rows[0]) { pid = r.rows[0].id; args.push(pid); where += ` and project_id=$${args.length}`; } } finally { client0.release() }
    }
    // optional client filter: restrict to projects under client when not admin
    if (clientId && !perms.includes('admin') && !perms.includes('manage_projects')) {
      // join projects to confirm client ownership
      const client2 = await getClientForReq(req as any)
      try {
        const ok = await client2.query('select 1 from projects p where p.client_id=$1 limit 1',[clientId])
        if (!ok.rows[0]) throw new ForbiddenException('client not found')
      } finally { client2.release() }
      where += ` and project_id in (select id from projects where client_id='${clientId.replace(/'/g, "''")}')`
    }
    const bucketExpr = bucket==='day' ? "date_trunc('day', created_at)" : bucket==='week' ? "date_trunc('week', created_at)" : "date_trunc('month', created_at)";
    const sql = `select ${bucketExpr} as bucket, sum(input_tokens+output_tokens+embed_tokens) as tokens, sum(cost_usd) as cost_usd, count(*) as requests from usage_events ${where} group by bucket order by bucket asc`;
    const client = await getClientForReq(req as any); try { const { rows } = await client.query(sql,args); return { rows } } finally { client.release() }
  }
  @Get("summary")
  async summary(@Req() req: ReqX, @Query("from") from?: string, @Query("to") to?: string, @Query("by") by="provider,model,operation", @Query("userId") userId?: string, @Query("projectId") projectId?: string, @Query("projectCode") projectCode?: string, @Query("clientId") clientId?: string) {
    const ctx = req.auth; if (!ctx?.orgId) throw new BadRequestException("org required"); if(!Array.isArray((ctx as any).perms) || !((ctx as any).perms as string[]).includes('view_usage')) throw new ForbiddenException('view_usage required');
    const fromD = parseDate(from, new Date(Date.now()-30*24*3600*1000)); const toD = parseDate(to, new Date());
    const cols = by.split(",").map(s=>s.trim()).filter(Boolean).filter(x=>["provider","model","operation"].includes(x));
    const groupSql = cols.length? cols.join(", ") : "provider, model, operation";
    const args:any[]=[ctx.orgUUID || ctx.orgId, fromD.toISOString(), toD.toISOString()];
    let where="where org_id=$1 and created_at >= $2 and created_at < $3";
    if (userId) { args.push(userId); where += ` and user_id=$${args.length}`; }
    let pid: string | null = null
    if (projectId) { pid = projectId; args.push(projectId); where += ` and project_id=$${args.length}`; }
    if (!pid && projectCode) {
      const org = ctx.orgUUID || ctx.orgId
      const client0 = await getClientForReq(req as any);
      try {
        const r = await client0.query('select p.id from projects p where p.org_id=$1 and p.code=$2', [org, projectCode])
        if (r.rows[0]) { pid = r.rows[0].id; args.push(pid); where += ` and project_id=$${args.length}`; }
      } finally { client0.release() }
    }

    // if filtering by project, enforce membership or manage_projects/admin permission
      const perms = (ctx as any).perms || []
      if (pid && !perms.includes('admin') && !perms.includes('manage_projects')) {
        const client1 = await getClientForReq(req as any);
      try {
        const m = await client1.query('select 1 from project_members where project_id=$1 and user_id=$2', [pid, ctx.userId])
        if (!m.rows[0]) throw new ForbiddenException('project membership required')
      } finally { client1.release() }
    }
    // If user is a client-scoped user (no admin/manage_projects) and has a clientId, restrict to their client's projects
    const clientIdToken = (req.auth as any)?.clientId as string | undefined
    let join = "";
    if (clientId && !perms.includes('admin') && !perms.includes('manage_projects')) {
      join = " left join projects p on p.id = usage_events.project_id ";
      args.push(clientId);
      where += ` and p.client_id = $${args.length}`;
    } else if (!perms.includes('admin') && !perms.includes('manage_projects') && clientIdToken) {
      // Only include events tied to projects belonging to this client
      join = " left join projects p on p.id = usage_events.project_id ";
      args.push(clientIdToken);
      where += ` and p.client_id = $${args.length}`;
    }
    const sql = `select ${groupSql}, sum(input_tokens) as in_tokens, sum(output_tokens) as out_tokens, sum(embed_tokens) as embed_tokens, round(sum(cost_usd)::numeric, 6) as cost_usd from usage_events${join} ${where} group by ${groupSql} order by sum(cost_usd) desc nulls last, ${groupSql} asc limit 1000`;
    const client = await getClientForReq(req as any); try { const { rows } = await client.query(sql,args); return { from: fromD.toISOString(), to: toD.toISOString(), groupBy: cols, rows }; } finally { client.release(); }
  }

  @Post("events")
  async addEvent(@Req() req: ReqX, @Body() body: any, @Headers('x-service-token') svcToken?: string) {
    const serviceToken = process.env.SERVICE_TOKEN || ''
    const isService = !!serviceToken && typeof svcToken === 'string' && svcToken === serviceToken
    const ctx = req.auth
    if (!isService && !ctx?.orgId) throw new BadRequestException("org required")
    const { provider, model, operation, input_tokens=0, output_tokens=0, embed_tokens=0, user_id=null, project_id=null, project_code=null, client_id=null, external_id=null, details=null, org_id=null } = body||{};
    if(!provider||!model||!operation) throw new BadRequestException("missing fields");
    const client = await getClientForReq(req as any);
    try {
      let pid: string | null = null;
      if (project_id) { pid = project_id; }
      else if (project_code) {
        const orgKey = isService ? (org_id || null) : (ctx.orgUUID || ctx.orgId)
        if (!orgKey) throw new BadRequestException('org required')
        const r = await client.query('select id, client_id from projects where org_id=$1 and code=$2', [orgKey, project_code]);
        pid = r.rows[0]?.id || null;
        // If client-scoped user, ensure project is within their client
        if (!isService) {
          const clientId = (req.auth as any)?.clientId as string | undefined;
          if (clientId && r.rows[0] && String(r.rows[0].client_id) !== String(clientId)) throw new ForbiddenException('project not in client');
        }
      }
      // validate client_id belongs to org if provided
      let cid: string | null = null
      if (client_id) {
        const orgKey = isService ? (org_id || null) : (ctx.orgUUID || ctx.orgId)
        if (!orgKey) throw new BadRequestException('org required')
        const r = await client.query('select id from clients where id=$1 and org_id=$2', [client_id, orgKey])
        cid = r.rows[0]?.id || null
        if (!cid) throw new BadRequestException('invalid client_id')
      }
      // cost computation if missing
      let cost_usd = Number(body?.cost_usd || 0)
      if (!cost_usd && (input_tokens || output_tokens || embed_tokens)) {
        const orgKey = isService ? (org_id || null) : (ctx.orgUUID || ctx.orgId)
        if (!orgKey) throw new BadRequestException('org required')
        const roles = (ctx as any)?.roles || []
        const inP = await unitPrice(provider, model, 'input_tokens', orgKey, user_id || ctx?.userId || undefined, roles)
        const outP = await unitPrice(provider, model, 'output_tokens', orgKey, user_id || ctx?.userId || undefined, roles)
        const embP = await unitPrice(provider, model, 'embed_tokens', orgKey, user_id || ctx?.userId || undefined, roles)
        cost_usd = 0
        cost_usd += (Number(input_tokens||0) / 1000) * inP
        cost_usd += (Number(output_tokens||0) / 1000) * outP
        cost_usd += (Number(embed_tokens||0) / 1000) * embP
        cost_usd = Number((Math.round(cost_usd * 1e6) / 1e6).toFixed(6))
      }
      const orgKey = isService ? (org_id || null) : (ctx.orgUUID || ctx.orgId)
      if (!orgKey) throw new BadRequestException('org required')
      await client.query(`insert into usage_events (org_id, user_id, project_id, client_id, provider, model, operation, input_tokens, output_tokens, embed_tokens, cost_usd, external_id, details)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [orgKey, user_id || ctx?.userId || null, pid, cid, provider, model, operation, input_tokens, output_tokens, embed_tokens, cost_usd, external_id, details || null]);
      return { ok: true };
    } finally { client.release(); }
  }
}
