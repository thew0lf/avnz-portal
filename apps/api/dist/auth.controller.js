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
import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { pool } from './db.js';
import { signToken, scryptHash, verifyPassword, randomToken, sha256hex } from './auth.util.js';
let AuthController = class AuthController {
    // Deprecated: direct registration removed in favor of invite acceptance
    async register(body) {
        const { invite_token, username, password } = body || {};
        if (!invite_token || !password)
            throw new BadRequestException('invite_token, password required');
        return await this.acceptInvite({ token: invite_token, username, password });
    }
    async login(body) {
        const { client_code, identifier, password } = body || {};
        if (!client_code || !identifier || !password)
            throw new BadRequestException('client_code, identifier, password required');
        const client = await pool.connect();
        try {
            // lookup client -> org
            const c = await client.query('select c.id as client_id, c.code as client_code, o.id as org_id from clients c join organizations o on o.id=c.org_id where c.code=$1', [client_code]);
            const clientRow = c.rows[0];
            if (!clientRow)
                throw new BadRequestException('invalid credentials');
            // identifier matches email or username
            const ident = String(identifier).toLowerCase();
            const u = await client.query('select id, email, username, password_hash from users where lower(email)=$1 or lower(username)=lower($2)', [ident, identifier]);
            const user = u.rows[0];
            if (!user)
                throw new BadRequestException('invalid credentials');
            // membership in org
            const m = await client.query('select role from memberships where user_id=$1 and org_id=$2', [user.id, clientRow.org_id]);
            const membership = m.rows[0];
            if (!membership)
                throw new BadRequestException('invalid credentials');
            const ok = verifyPassword(password, user.password_hash);
            if (!ok)
                throw new BadRequestException('invalid credentials');
            // permissions for membership role
            let perms = [];
            const rp = await client.query(`select p.key from memberships m
         left join roles r on r.id = m.role_id
         left join role_permissions rp on rp.role_id = r.id
         left join permissions p on p.id = rp.permission_id
         where m.user_id=$1 and m.org_id=$2`, [user.id, clientRow.org_id]);
            perms = rp.rows.map((x) => x.key).filter(Boolean);
            const token = signToken({
                userId: String(user.id),
                email: user.email,
                orgId: clientRow.client_code, // legacy text id
                roles: [membership.role],
                orgUUID: String(clientRow.org_id),
                clientCode: String(clientRow.client_code),
                clientId: String(clientRow.client_id),
                perms,
            }, process.env.AUTH_SECRET || 'dev-secret-change-me');
            // create refresh token (30 days)
            const refresh = randomToken(32);
            const hash = sha256hex(refresh);
            const exp = new Date(Date.now() + 30 * 24 * 3600 * 1000);
            await client.query('insert into refresh_tokens(user_id, token_hash, expires_at) values ($1,$2,$3)', [user.id, hash, exp.toISOString()]);
            return {
                token,
                refresh_token: refresh,
                refresh_expires: exp.toISOString(),
                user: { id: user.id, org_id: clientRow.org_id, client_id: clientRow.client_id, client_code: clientRow.client_code, email: user.email, username: user.username, roles: [membership.role] },
            };
        }
        finally {
            client.release();
        }
    }
    async acceptInvite(body) {
        const { token, username, password } = body || {};
        if (!token || !password)
            throw new BadRequestException('token, password required');
        const hash = sha256hex(String(token));
        const client = await pool.connect();
        try {
            const iv = await client.query('select id, org_id, client_id, email, role, role_id, expires_at, used_at, revoked from client_invites where token_hash=$1', [hash]);
            const inv = iv.rows[0];
            if (!inv)
                throw new BadRequestException('invalid invite');
            if (inv.used_at)
                throw new BadRequestException('invite already used');
            if (inv.revoked)
                throw new BadRequestException('invite revoked');
            if (new Date(inv.expires_at).getTime() < Date.now())
                throw new BadRequestException('invite expired');
            // create user
            const pw = scryptHash(String(password));
            const uIns = await client.query('insert into users(org_id,email,username,password_hash) values ($1,$2,$3,$4) returning id, email, username, created_at', [
                // users.org_id legacy stores client code (text). Lookup client code by id.
                (await client.query('select code from clients where id=$1', [inv.client_id])).rows[0].code,
                String(inv.email).toLowerCase(),
                username || null,
                pw,
            ]);
            const user = uIns.rows[0];
            // org membership
            let roleName = inv.role || 'user';
            let roleId = inv.role_id || null;
            if (roleId) {
                const r = await client.query('select id from roles where id=$1 and org_id=$2', [roleId, inv.org_id]);
                roleId = r.rows[0]?.id || null;
            }
            await client.query('insert into memberships(user_id, org_id, role, role_id) values ($1,$2,$3,$4) on conflict do update set role=excluded.role, role_id=excluded.role_id', [user.id, inv.org_id, roleName, roleId]);
            // client membership
            await client.query('insert into client_members(user_id, client_id, role) values ($1,$2,$3) on conflict do nothing', [user.id, inv.client_id, roleName]);
            // mark invite used
            await client.query('update client_invites set used_at=now() where id=$1', [inv.id]);
            // include client_code for login convenience
            const c = await client.query('select code from clients where id=$1', [inv.client_id]);
            const clientCode = c.rows[0]?.code;
            return { ok: true, user: { id: user.id, email: user.email, username: user.username }, client_code: clientCode };
        }
        finally {
            client.release();
        }
    }
    async refresh(body) {
        const { refresh_token } = body || {};
        if (!refresh_token)
            throw new BadRequestException('missing refresh_token');
        const hash = sha256hex(String(refresh_token));
        const client = await pool.connect();
        try {
            const { rows } = await client.query('select rt.user_id, u.org_id, u.email, u.roles, rt.expires_at, rt.revoked from refresh_tokens rt join users u on u.id=rt.user_id where rt.token_hash=$1', [hash]);
            const row = rows[0];
            if (!row)
                throw new BadRequestException('invalid refresh token');
            if (row.revoked)
                throw new BadRequestException('refresh token revoked');
            if (new Date(row.expires_at).getTime() < Date.now())
                throw new BadRequestException('refresh token expired');
            await client.query('update refresh_tokens set last_used_at=now() where token_hash=$1', [hash]);
            const token = signToken({ userId: String(row.user_id), email: row.email, orgId: row.org_id, roles: row.roles || [] }, process.env.AUTH_SECRET || 'dev-secret-change-me');
            return { token };
        }
        finally {
            client.release();
        }
    }
    async requestReset(body) {
        const { client_code, email, identifier } = body || {};
        const ident = email || identifier;
        if (!client_code || !ident)
            throw new BadRequestException('client_code and email/identifier required');
        const client = await pool.connect();
        try {
            const u = await client.query('select id from users where org_id=$1 and (email=$2 or lower(username)=lower($3))', [client_code, String(ident).toLowerCase(), ident]);
            const user = u.rows[0];
            if (!user)
                return { ok: true }; // do not leak
            const token = randomToken(32);
            const hash = sha256hex(token);
            const exp = new Date(Date.now() + 60 * 60 * 1000);
            await client.query('insert into password_resets(user_id, token_hash, expires_at) values ($1,$2,$3)', [user.id, hash, exp.toISOString()]);
            // For dev, return token. In prod, send email instead.
            return { ok: true, reset_token: token, expires: exp.toISOString() };
        }
        finally {
            client.release();
        }
    }
    async reset(body) {
        const { token, password } = body || {};
        if (!token || !password)
            throw new BadRequestException('token, password required');
        const hash = sha256hex(String(token));
        const client = await pool.connect();
        try {
            const { rows } = await client.query('select pr.user_id, pr.expires_at, pr.used_at from password_resets pr where pr.token_hash=$1', [hash]);
            const row = rows[0];
            if (!row)
                throw new BadRequestException('invalid token');
            if (row.used_at)
                throw new BadRequestException('token already used');
            if (new Date(row.expires_at).getTime() < Date.now())
                throw new BadRequestException('token expired');
            const pw = scryptHash(String(password));
            await client.query('update users set password_hash=$1 where id=$2', [pw, row.user_id]);
            await client.query('update password_resets set used_at=now() where token_hash=$1', [hash]);
            // revoke all refresh tokens for the user
            await client.query('update refresh_tokens set revoked=true where user_id=$1', [row.user_id]);
            return { ok: true };
        }
        finally {
            client.release();
        }
    }
};
__decorate([
    Post('register'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    Post('login'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    Post('accept-invite'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "acceptInvite", null);
__decorate([
    Post('refresh'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    Post('request-reset'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestReset", null);
__decorate([
    Post('reset'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "reset", null);
AuthController = __decorate([
    Controller('auth')
], AuthController);
export { AuthController };
