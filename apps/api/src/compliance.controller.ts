import { Controller, Get, Query, Req, BadRequestException, Header, Res } from "@nestjs/common";
import type { Request } from "express";
import { withRls } from "./db.js";
type ReqX = Request & { auth?: { userId: string; orgId: string } };
@Controller("compliance")
export class ComplianceController {
  @Get("redactions")
  async redactions(@Req() req: ReqX, @Query("nodeType") nodeType: string, @Query("nodeId") nodeId: string) {
    const ctx=req.auth; if(!ctx) throw new BadRequestException("No auth"); if(!nodeType||!nodeId) throw new BadRequestException("nodeType, nodeId required");
    return withRls(ctx.userId, ctx.orgId, async (client:any)=>{
      const { rows } = await client.query(`select date_trunc('day', created_at) as day, sum(pii_email) as email, sum(pii_phone) as phone, sum(pii_ssn) as ssn, sum(pii_cc) as cc from redaction_events where node_type=$1 and node_id=$2 group by 1 order by 1 asc`, [nodeType,nodeId]);
      return { nodeType, nodeId, series: rows };
    });
  }
  @Get("redactions/by-document")
  async doc(@Req() req: ReqX, @Query("documentId") documentId: string) {
    const ctx=req.auth; if(!ctx) throw new BadRequestException("No auth"); if(!documentId) throw new BadRequestException("documentId required");
    return withRls(ctx.userId, ctx.orgId, async (client:any)=>{
      const { rows } = await client.query(`select created_at::date as day, pii_email as email, pii_phone as phone, pii_ssn as ssn, pii_cc as cc from redaction_events where document_id=$1 order by created_at asc`, [documentId]);
      return { documentId, series: rows };
    });
  }
  @Get("redactions/export.csv")
  @Header("Content-Type","text/csv")
  async exportCsv(@Req() req: ReqX, @Query("nodeType") nodeType: string, @Query("nodeId") nodeId: string, @Res() res:any) {
    const ctx=req.auth; if(!ctx) throw new BadRequestException("No auth"); if(!nodeType||!nodeId) throw new BadRequestException("nodeType, nodeId required");
    return withRls(ctx.userId, ctx.orgId, async (client:any)=>{
      const { rows } = await client.query(`select date_trunc('day', created_at) as day, sum(pii_email) as email, sum(pii_phone) as phone, sum(pii_ssn) as ssn, sum(pii_cc) as cc from redaction_events where node_type=$1 and node_id=$2 group by 1 order by 1 asc`, [nodeType,nodeId]);
      const header="day,email,phone,ssn,cc\n"; const csv = header + rows.map((r:any)=>`${new Date(r.day).toISOString().slice(0,10)},${r.email||0},${r.phone||0},${r.ssn||0},${r.cc||0}`).join("\n"); res.send(csv);
    });
  }
  @Get("redactions/by-document/export.csv")
  @Header("Content-Type","text/csv")
  async docCsv(@Req() req: ReqX, @Query("documentId") documentId: string, @Res() res:any) {
    const ctx=req.auth; if(!ctx) throw new BadRequestException("No auth"); if(!documentId) throw new BadRequestException("documentId required");
    return withRls(ctx.userId, ctx.orgId, async (client:any)=>{
      const { rows } = await client.query(`select created_at::date as day, pii_email as email, pii_phone as phone, pii_ssn as ssn, pii_cc as cc from redaction_events where document_id=$1 order by created_at asc`, [documentId]);
      const header="day,email,phone,ssn,cc\n"; const csv = header + rows.map((r:any)=>`${new Date(r.day).toISOString().slice(0,10)},${r.email||0},${r.phone||0},${r.ssn||0},${r.cc||0}`).join("\n"); res.send(csv);
    });
  }
}
