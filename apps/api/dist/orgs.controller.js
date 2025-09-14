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
import { Controller, Post, Body, BadRequestException, Get, Req } from '@nestjs/common';
import { pool } from './db.js';
import { hashPassword, signToken, randomToken, sha256hex } from './auth.util.js';
import { validatePassword } from './security.js';
let OrgsController = class OrgsController {
    async mine(req) {
        const userId = req?.auth?.userId;
        if (!userId)
            throw new BadRequestException('unauthorized');
        const c = await pool.connect();
        try {
            const r = await c.query(`select o.id, o.code, o.name from organizations o join memberships m on m.org_id=o.id where m.user_id=$1 group by o.id, o.code, o.name order by o.name`, [userId]);
            return { rows: r.rows };
        }
        finally {
            c.release();
        }
    }
    async register(body) {
        const { org_code, org_name, email, username, password } = body || {};
        if (!org_code || !org_name || !email || !password)
            throw new BadRequestException('org_code, org_name, email, password required');
        const client = await pool.connect();
        try {
            await client.query('begin');
            // Create org
            const orgIns = await client.query('insert into organizations(code, name) values ($1,$2) returning id, code, name', [String(org_code).toLowerCase(), org_name]);
            const org = orgIns.rows[0];
            // Create user
            await validatePassword(client, String(password));
            const pw = await hashPassword(String(password));
            // Note: users.org_id is a legacy TEXT column; set to org.code for compatibility
            const u = await client.query('insert into users(org_id,email,username,password_hash) values ($1,$2,$3,$4) returning id, email, username', [String(org.code), String(email).toLowerCase(), username || null, pw]);
            const user = u.rows[0];
            // Create org-level role 'org' (client_id is null), tolerate duplicates
            let roleId = null;
            const roleIns = await client.query('insert into roles(org_id, client_id, name, description) values ($1,$2,$3,$4) on conflict do nothing returning id', [org.id, null, 'org', 'Organization manager']);
            roleId = roleIns.rows[0]?.id || null;
            if (!roleId) {
                const r = await client.query('select id from roles where org_id=$1 and client_id is null and name=$2', [org.id, 'org']);
                roleId = r.rows[0]?.id || null;
            }
            if (!roleId)
                throw new Error('failed to create or find org role');
            const perms = await client.query('select id from permissions');
            for (const p of perms.rows) {
                await client.query('insert into role_permissions(role_id, permission_id) values ($1,$2) on conflict do nothing', [roleId, p.id]);
            }
            // Membership
            await client.query('insert into memberships(user_id, org_id, role, role_id) values ($1,$2,$3,$4)', [user.id, org.id, 'org', roleId]);
            await client.query('commit');
            // Build perms list for token
            const permsKeys = await client.query('select key from permissions');
            const permList = permsKeys.rows.map((x) => x.key);
            // Issue tokens
            const token = signToken({ userId: String(user.id), email: user.email, orgId: org.code, roles: ['org'], orgUUID: String(org.id), clientCode: String(org.code), perms: permList }, process.env.AUTH_SECRET || 'dev-secret-change-me');
            const refresh = randomToken(32);
            const hash = sha256hex(refresh);
            const exp = new Date(Date.now() + 30 * 24 * 3600 * 1000);
            await client.query('insert into refresh_tokens(user_id, token_hash, expires_at) values ($1,$2,$3)', [user.id, hash, exp.toISOString()]);
            return { token, refresh_token: refresh, refresh_expires: exp.toISOString(), user: { id: user.id, email: user.email }, org: { id: org.id, code: org.code, name: org.name } };
        }
        catch (e) {
            try {
                await client.query('rollback');
            }
            catch { }
            if (String(e?.message || '').includes('organizations_code_key'))
                throw new BadRequestException('org_code already exists');
            if (String(e?.message || '').includes('users_email_key') || String(e?.message || '').includes('idx_users_email'))
                throw new BadRequestException('email already exists');
            throw e;
        }
        finally {
            client.release();
        }
    }
};
__decorate([
    Get('mine'),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrgsController.prototype, "mine", null);
__decorate([
    Post('register'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrgsController.prototype, "register", null);
OrgsController = __decorate([
    Controller('orgs')
], OrgsController);
export { OrgsController };
