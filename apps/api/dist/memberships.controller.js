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
import { Controller, Get, Post, Body, BadRequestException, Req, ForbiddenException } from '@nestjs/common';
import { pool } from './db.js';
let MembershipsController = class MembershipsController {
    async list(req) {
        const org = req.auth?.orgUUID;
        if (!org)
            throw new BadRequestException('org required');
        const perms = req.auth?.perms || [];
        if (!perms.includes('manage_members') && !perms.includes('admin'))
            throw new ForbiddenException('manage_members required');
        const client = await pool.connect();
        try {
            const { rows } = await client.query(`select m.user_id, m.role, u.email, u.username, m.created_at
         from memberships m join users u on u.id=m.user_id where m.org_id=$1 order by u.email asc`, [org]);
            return { rows };
        }
        finally {
            client.release();
        }
    }
    async add(req, body) {
        const org = req.auth?.orgUUID;
        if (!org)
            throw new BadRequestException('org required');
        const perms = req.auth?.perms || [];
        if (!perms.includes('manage_members') && !perms.includes('admin'))
            throw new ForbiddenException('manage_members required');
        const { identifier, role = 'user', role_id } = body || {};
        if (!identifier)
            throw new BadRequestException('identifier required');
        const client = await pool.connect();
        try {
            const ident = String(identifier).toLowerCase();
            const u = await client.query('select id from users where lower(email)=$1 or lower(username)=lower($2)', [ident, identifier]);
            const user = u.rows[0];
            if (!user)
                throw new BadRequestException('user not found');
            // optional role_id override
            let rid = null;
            if (role_id) {
                const r = await client.query('select id from roles where id=$1 and org_id=$2', [role_id, org]);
                rid = r.rows[0]?.id || null;
                if (!rid)
                    throw new BadRequestException('invalid role_id');
            }
            else if (role) {
                // org-level role (client_id null); tolerate duplicates
                const r = await client.query('insert into roles(org_id, client_id, name) values ($1,$2,$3) on conflict do nothing returning id', [org, null, role]);
                rid = r.rows[0]?.id || null;
                if (!rid) {
                    const r2 = await client.query('select id from roles where org_id=$1 and client_id is null and name=$2', [org, role]);
                    rid = r2.rows[0]?.id || null;
                }
            }
            await client.query('insert into memberships(user_id, org_id, role, role_id) values ($1,$2,$3,$4) on conflict (user_id, org_id) do update set role=excluded.role, role_id=excluded.role_id', [user.id, org, role, rid]);
            return { ok: true };
        }
        finally {
            client.release();
        }
    }
};
__decorate([
    Get(),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MembershipsController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipsController.prototype, "add", null);
MembershipsController = __decorate([
    Controller('memberships')
], MembershipsController);
export { MembershipsController };
