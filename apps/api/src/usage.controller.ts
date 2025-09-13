import { Controller, Get, Post, Body, Query, Req, BadRequestException, ForbiddenException } from "@nestjs/common";
import type { Request } from "express";
import { pool, getClientForReq } from "./db.js";
type ReqX = Request & { auth?: { userId?: string; orgId?: string; orgUUID?: string; roles?: string[] } };
function parseDate(s?: string, def?: Date) { if (!s) return def || new Date(Date.now()-7*24*3600*1000); const d=new Date(s); if(isNaN(d.getTime())) throw new BadRequestException("invalid date"); return d; }

@Controller("usage")
export class UsageController {
  @Get("summary")
  async summary(@Req() req: ReqX, @Query("from") from?: string, @Query("to") to?: string, @Query("by") by="provider,model,operation", @Query("userId") userId?: string, @Query("projectId") projectId?: string, @Query("projectCode") projectCode?: string) {
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
    const clientId = (req.auth as any)?.clientId as string | undefined
    let join = "";
    if (!perms.includes('admin') && !perms.includes('manage_projects') && clientId) {
      // Only include events tied to projects belonging to this client
      join = " left join projects p on p.id = usage_events.project_id ";
      args.push(clientId);
      where += ` and p.client_id = $${args.length}`;
    }
    const sql = `select ${groupSql}, sum(input_tokens) as in_tokens, sum(output_tokens) as out_tokens, sum(embed_tokens) as embed_tokens, round(sum(cost_usd)::numeric, 6) as cost_usd from usage_events${join} ${where} group by ${groupSql} order by sum(cost_usd) desc nulls last, ${groupSql} asc limit 1000`;
    const client = await getClientForReq(req as any); try { const { rows } = await client.query(sql,args); return { from: fromD.toISOString(), to: toD.toISOString(), groupBy: cols, rows }; } finally { client.release(); }
  }

  @Post("events")
  async addEvent(@Req() req: ReqX, @Body() body: any) {
    const ctx = req.auth; if (!ctx?.orgId) throw new BadRequestException("org required");
    const { provider, model, operation, input_tokens=0, output_tokens=0, embed_tokens=0, cost_usd=0, user_id=null, project_id=null, project_code=null } = body||{};
    if(!provider||!model||!operation) throw new BadRequestException("missing fields");
    const client = await getClientForReq(req as any);
    try {
      let pid: string | null = null;
      if (project_id) { pid = project_id; }
      else if (project_code) {
        const r = await client.query('select id, client_id from projects where org_id=$1 and code=$2', [ctx.orgUUID || ctx.orgId, project_code]);
        pid = r.rows[0]?.id || null;
        // If client-scoped user, ensure project is within their client
        const clientId = (req.auth as any)?.clientId as string | undefined;
        if (clientId && r.rows[0] && String(r.rows[0].client_id) !== String(clientId)) throw new ForbiddenException('project not in client');
      }
      await client.query(`insert into usage_events (org_id, user_id, project_id, provider, model, operation, input_tokens, output_tokens, embed_tokens, cost_usd) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [ctx.orgUUID || ctx.orgId, user_id || ctx.userId || null, pid, provider, model, operation, input_tokens, output_tokens, embed_tokens, cost_usd]);
      return { ok: true };
    } finally { client.release(); }
  }
}
