var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Query, Req, BadRequestException, Header, Res } from "@nestjs/common";
import { withRls } from "./db.js";
let ComplianceController = class ComplianceController {
    async redactions(req, nodeType, nodeId) {
        const ctx = req.auth;
        if (!ctx)
            throw new BadRequestException("No auth");
        if (!nodeType || !nodeId)
            throw new BadRequestException("nodeType, nodeId required");
        return withRls(ctx.userId, ctx.orgId, async (client) => {
            const { rows } = await client.query(`select date_trunc('day', created_at) as day, sum(pii_email) as email, sum(pii_phone) as phone, sum(pii_ssn) as ssn, sum(pii_cc) as cc from redaction_events where node_type=$1 and node_id=$2 group by 1 order by 1 asc`, [nodeType, nodeId]);
            return { nodeType, nodeId, series: rows };
        });
    }
    async doc(req, documentId) {
        const ctx = req.auth;
        if (!ctx)
            throw new BadRequestException("No auth");
        if (!documentId)
            throw new BadRequestException("documentId required");
        return withRls(ctx.userId, ctx.orgId, async (client) => {
            const { rows } = await client.query(`select created_at::date as day, pii_email as email, pii_phone as phone, pii_ssn as ssn, pii_cc as cc from redaction_events where document_id=$1 order by created_at asc`, [documentId]);
            return { documentId, series: rows };
        });
    }
    async exportCsv(req, nodeType, nodeId, res) {
        const ctx = req.auth;
        if (!ctx)
            throw new BadRequestException("No auth");
        if (!nodeType || !nodeId)
            throw new BadRequestException("nodeType, nodeId required");
        return withRls(ctx.userId, ctx.orgId, async (client) => {
            const { rows } = await client.query(`select date_trunc('day', created_at) as day, sum(pii_email) as email, sum(pii_phone) as phone, sum(pii_ssn) as ssn, sum(pii_cc) as cc from redaction_events where node_type=$1 and node_id=$2 group by 1 order by 1 asc`, [nodeType, nodeId]);
            const header = "day,email,phone,ssn,cc\n";
            const csv = header + rows.map((r) => `${new Date(r.day).toISOString().slice(0, 10)},${r.email || 0},${r.phone || 0},${r.ssn || 0},${r.cc || 0}`).join("\n");
            res.send(csv);
        });
    }
    async docCsv(req, documentId, res) {
        const ctx = req.auth;
        if (!ctx)
            throw new BadRequestException("No auth");
        if (!documentId)
            throw new BadRequestException("documentId required");
        return withRls(ctx.userId, ctx.orgId, async (client) => {
            const { rows } = await client.query(`select created_at::date as day, pii_email as email, pii_phone as phone, pii_ssn as ssn, pii_cc as cc from redaction_events where document_id=$1 order by created_at asc`, [documentId]);
            const header = "day,email,phone,ssn,cc\n";
            const csv = header + rows.map((r) => `${new Date(r.day).toISOString().slice(0, 10)},${r.email || 0},${r.phone || 0},${r.ssn || 0},${r.cc || 0}`).join("\n");
            res.send(csv);
        });
    }
};
__decorate([
    Get("redactions"),
    __param(0, Req()),
    __param(1, Query("nodeType")),
    __param(2, Query("nodeId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ComplianceController.prototype, "redactions", null);
__decorate([
    Get("redactions/by-document"),
    __param(0, Req()),
    __param(1, Query("documentId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ComplianceController.prototype, "doc", null);
__decorate([
    Get("redactions/export.csv"),
    Header("Content-Type", "text/csv"),
    __param(0, Req()),
    __param(1, Query("nodeType")),
    __param(2, Query("nodeId")),
    __param(3, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], ComplianceController.prototype, "exportCsv", null);
__decorate([
    Get("redactions/by-document/export.csv"),
    Header("Content-Type", "text/csv"),
    __param(0, Req()),
    __param(1, Query("documentId")),
    __param(2, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ComplianceController.prototype, "docCsv", null);
ComplianceController = __decorate([
    Controller("compliance")
], ComplianceController);
export { ComplianceController };
