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
import { Controller, Get, Post, Delete, Body, Param, Req, BadRequestException, ForbiddenException } from "@nestjs/common";
import { pool } from "./db.js";
let PricingController = class PricingController {
    async test(req) {
        const ctx = req.auth || {};
        const org = ctx.orgUUID || ctx.orgId;
        if (!org)
            throw new BadRequestException("org required");
        const url = new URL(req.url, "http://local");
        const provider = url.searchParams.get("provider") || "bedrock";
        const model = url.searchParams.get("model") || "anthropic.claude-3-haiku-20240307-v1:0";
        const inTok = Number(url.searchParams.get("in") || "0");
        const outTok = Number(url.searchParams.get("out") || "0");
        const embTok = Number(url.searchParams.get("embed") || "0");
        const roles = Array.isArray(ctx.roles) ? ctx.roles : [];
        const unitIn = await this.unitPrice(provider, model, "input_tokens", org, ctx.userId, roles);
        const unitOut = await this.unitPrice(provider, model, "output_tokens", org, ctx.userId, roles);
        const unitEmb = await this.unitPrice(provider, model, "embed_tokens", org, ctx.userId, roles);
        const cost = unitIn * (inTok / 1000) + unitOut * (outTok / 1000) + unitEmb * (embTok / 1000);
        return { provider, model, tokens: { in: inTok, out: outTok, embed: embTok }, unit: { input: unitIn, output: unitOut, embed: unitEmb }, cost_usd: Number(cost.toFixed(6)) };
    }
    async unitPrice(provider, model, metric, orgId, userId, roles = []) {
        const client = await pool.connect();
        try {
            if (userId) {
                const { rows } = await client.query(`select price_per_1k from pricing_rules where scope='user' and user_id=$1 and provider=$2 and model=$3 and metric=$4 and active=true and deleted_at is null limit 1`, [userId, provider, model, metric]);
                if (rows[0])
                    return Number(rows[0].price_per_1k);
            }
            if (roles.length) {
                const { rows } = await client.query(`select price_per_1k from pricing_rules where scope='role' and role = ANY($1) and provider=$2 and model=$3 and metric=$4 and active=true and deleted_at is null order by price_per_1k asc limit 1`, [roles, provider, model, metric]);
                if (rows[0])
                    return Number(rows[0].price_per_1k);
            }
            {
                const { rows } = await client.query(`select price_per_1k from pricing_rules where scope='org' and org_id=$1 and provider=$2 and model=$3 and metric=$4 and active=true and deleted_at is null limit 1`, [orgId, provider, model, metric]);
                if (rows[0])
                    return Number(rows[0].price_per_1k);
            }
            {
                const { rows } = await client.query(`select price_per_1k from pricing_rules where scope='default' and provider=$1 and model=$2 and metric=$3 and active=true and deleted_at is null limit 1`, [provider, model, metric]);
                if (rows[0])
                    return Number(rows[0].price_per_1k);
            }
            return 0;
        }
        finally {
            client.release();
        }
    }
    async list(req) { const ctx = req.auth || {}; const org = ctx.orgUUID || ctx.orgId; if (!org)
        throw new BadRequestException("org required"); const client = await pool.connect(); try {
        const { rows } = await client.query("select * from pricing_rules where deleted_at is null order by scope, provider, model, metric");
        return { rows };
    }
    finally {
        client.release();
    } }
    async create(req, body) {
        const ctx = req.auth || {};
        const org = ctx.orgUUID || ctx.orgId;
        const perms = ctx.perms || [];
        if (!org)
            throw new BadRequestException("org required");
        if (!perms.includes('manage_pricing'))
            throw new ForbiddenException("manage_pricing required");
        const { scope, org_id, role, user_id, provider, model, metric, price_per_1k, currency = 'USD', active = true } = body || {};
        if (!scope || !provider || !model || !metric || price_per_1k == null)
            throw new BadRequestException("missing fields");
        const client = await pool.connect();
        try {
            const { rows } = await client.query(`insert into pricing_rules(scope, org_id, role, user_id, provider, model, metric, price_per_1k, currency, active) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`, [scope, org_id || org, role || null, user_id || null, provider, model, metric, price_per_1k, currency, active]);
            await client.query(`insert into audit_log(org_id, user_id, action, entity, entity_id, after) values ($1,$2,'create','pricing_rule',$3,$4)`, [org, ctx.userId || null, String(rows[0].id), rows[0]]);
            return rows[0];
        }
        finally {
            client.release();
        }
    }
    async softDelete(req, id) {
        const ctx = req.auth || {};
        const org = ctx.orgUUID || ctx.orgId;
        const perms = ctx.perms || [];
        if (!org)
            throw new BadRequestException("org required");
        if (!perms.includes('manage_pricing'))
            throw new ForbiddenException("manage_pricing required");
        const client = await pool.connect();
        try {
            const before = await client.query("select * from pricing_rules where id=$1", [id]);
            await client.query("update pricing_rules set deleted_at=now(), active=false where id=$1", [id]);
            await client.query(`insert into audit_log(org_id, user_id, action, entity, entity_id, before) values ($1,$2,'delete','pricing_rule',$3,$4)`, [org, ctx.userId || null, id, before.rows[0] || null]);
            return { ok: true };
        }
        finally {
            client.release();
        }
    }
};
__decorate([
    Get("test"),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "test", null);
__decorate([
    Get("rules"),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "list", null);
__decorate([
    Post("rules"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "create", null);
__decorate([
    Delete("rules/:id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "softDelete", null);
PricingController = __decorate([
    Controller("pricing")
], PricingController);
export { PricingController };
