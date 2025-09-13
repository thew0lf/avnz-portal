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
import { Controller, Get, Post, Body, Param, BadRequestException, Req } from '@nestjs/common';
import { pool, getClientForReq } from './db.js';
import { audit } from './audit.js';
let RolesController = class RolesController {
    async list(req) {
        const org = req.auth?.orgUUID;
        if (!org)
            throw new BadRequestException('org required');
        const perms = req.auth?.perms || [];
        const clientId = req.auth?.clientId || null;
        const client = await getClientForReq(req);
        try {
            if (!perms.includes('admin') && !perms.includes('manage_members') && clientId) {
                // Client users: only see roles scoped to their client
                const { rows } = await client.query(`select r.id, r.name, r.description,
                  coalesce(json_agg(p.key order by p.key) filter (where p.key is not null), '[]') as permissions
           from roles r
           left join role_permissions rp on rp.role_id = r.id
           left join permissions p on p.id = rp.permission_id
           where r.org_id = $1 and r.client_id = $2
           group by r.id
           order by r.name asc`, [org, clientId]);
                return { rows };
            }
            // Org admins/managers: see all roles in org (org-level + client-level)
            const { rows } = await client.query(`select r.id, r.name, r.description,
                coalesce(json_agg(p.key order by p.key) filter (where p.key is not null), '[]') as permissions
         from roles r
         left join role_permissions rp on rp.role_id = r.id
         left join permissions p on p.id = rp.permission_id
         where r.org_id = $1
         group by r.id
         order by r.name asc`, [org]);
            return { rows };
        }
        finally {
            client.release();
        }
    }
    async create(req, body) {
        const org = req.auth?.orgUUID;
        if (!org)
            throw new BadRequestException('org required');
        const perms = req.auth?.perms || [];
        const requesterClientId = req.auth?.clientId || null;
        const { name, description, client_id } = body || {};
        if (!name)
            throw new BadRequestException('name required');
        const client = await getClientForReq(req);
        try {
            // Decide scope: if requester is client-scoped without org-wide perms, force role under their client
            let scopeClientId = null;
            if (!perms.includes('admin') && !perms.includes('manage_members') && requesterClientId) {
                scopeClientId = requesterClientId;
            }
            else {
                // Org admins/managers can optionally create client-level roles by passing client_id
                scopeClientId = client_id || null;
            }
            const { rows } = await client.query('insert into roles(org_id, client_id, name, description) values ($1,$2,$3,$4) returning id, name, description', [org, scopeClientId, name, description || null]);
            await audit(req, 'create', 'authz.role', rows[0]?.id, null, rows[0]);
            return rows[0];
        }
        finally {
            client.release();
        }
    }
    async permissions() {
        const client = await getClientForReq({});
        try {
            const { rows } = await client.query('select id, key, description from permissions order by key asc');
            return { rows };
        }
        finally {
            client.release();
        }
    }
    async setPermissions(req, id, body) {
        const org = req.auth?.orgUUID;
        if (!org)
            throw new BadRequestException('org required');
        const { keys } = body || {};
        if (!Array.isArray(keys))
            throw new BadRequestException('keys[] required');
        const client = await getClientForReq(req);
        try {
            // validate role belongs to org and requester can modify it
            const r = await client.query('select id, client_id from roles where id=$1 and org_id=$2', [id, org]);
            const role = r.rows[0];
            if (!role)
                throw new BadRequestException('role not found');
            const perms = req.auth?.perms || [];
            const requesterClientId = req.auth?.clientId || null;
            if (role.client_id) {
                // client-level role: allow if admin/manage_members or same client
                if (!perms.includes('admin') && !perms.includes('manage_members')) {
                    if (!requesterClientId || String(requesterClientId) !== String(role.client_id)) {
                        throw new BadRequestException('not allowed for this client role');
                    }
                }
            }
            else {
                // org-level role: require org-wide perms
                if (!perms.includes('admin') && !perms.includes('manage_members'))
                    throw new BadRequestException('manage_members required');
            }
            // map keys to permission ids
            const p = await client.query('select id, key from permissions where key = any($1)', [keys]);
            const ids = p.rows.map((x) => x.id);
            const before = await client.query('select rp.permission_id from role_permissions rp where role_id=$1', [id]);
            await client.query('delete from role_permissions where role_id=$1', [id]);
            for (const pid of ids) {
                await client.query('insert into role_permissions(role_id, permission_id) values ($1,$2) on conflict do nothing', [id, pid]);
            }
            await audit(req, 'update', 'authz.role_permissions', id, { permissions: before.rows }, { permissions: ids });
            return { ok: true, count: ids.length };
        }
        finally {
            client.release();
        }
    }
    async members(req, id) {
        const org = req.auth?.orgUUID;
        if (!org)
            throw new BadRequestException('org required');
        const client = await getClientForReq(req);
        try {
            const r = await client.query('select id from roles where id=$1 and org_id=$2', [id, org]);
            if (!r.rows[0])
                throw new BadRequestException('role not found');
            const { rows } = await client.query(`select m.user_id, m.created_at, u.email, u.username
         from memberships m join users u on u.id=m.user_id
         where m.org_id=$1 and m.role_id=$2
         order by u.email asc`, [org, id]);
            return { rows };
        }
        finally {
            client.release();
        }
    }
    async assign(req, id, body) {
        const org = req.auth?.orgUUID;
        if (!org)
            throw new BadRequestException('org required');
        const { identifier } = body || {};
        if (!identifier)
            throw new BadRequestException('identifier required');
        const client = await pool.connect();
        try {
            const r = await client.query('select id, name, client_id from roles where id=$1 and org_id=$2', [id, org]);
            const role = r.rows[0];
            if (!role)
                throw new BadRequestException('role not found');
            const perms = req.auth?.perms || [];
            const requesterClientId = req.auth?.clientId || null;
            if (role.client_id) {
                // client-level role: allow if admin/manage_members or same client
                if (!perms.includes('admin') && !perms.includes('manage_members')) {
                    if (!requesterClientId || String(requesterClientId) !== String(role.client_id)) {
                        throw new BadRequestException('not allowed for this client role');
                    }
                }
            }
            else {
                // org-level role: require org-wide perms
                if (!perms.includes('admin') && !perms.includes('manage_members'))
                    throw new BadRequestException('manage_members required');
            }
            const ident = String(identifier).toLowerCase();
            const u = await client.query('select id from users where lower(email)=$1 or lower(username)=lower($2)', [ident, identifier]);
            const user = u.rows[0];
            if (!user)
                throw new BadRequestException('user not found');
            if (role.client_id) {
                // ensure user is a member of the same client before assigning client-level role
                const cm = await client.query('select 1 from client_members where user_id=$1 and client_id=$2', [user.id, role.client_id]);
                if (!cm.rows[0])
                    throw new BadRequestException('user not in client');
            }
            await client.query('insert into memberships(user_id, org_id, role, role_id) values ($1,$2,$3,$4) on conflict (user_id,org_id) do update set role=$3, role_id=$4', [user.id, org, role.name, role.id]);
            await audit(req, 'upsert', 'membership', String(user.id), null, { org_id: org, role: role.name, role_id: role.id });
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
], RolesController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "create", null);
__decorate([
    Get('permissions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "permissions", null);
__decorate([
    Post(':id/permissions'),
    __param(0, Req()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "setPermissions", null);
__decorate([
    Get(':id/members'),
    __param(0, Req()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "members", null);
__decorate([
    Post(':id/assign'),
    __param(0, Req()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "assign", null);
RolesController = __decorate([
    Controller('roles')
], RolesController);
export { RolesController };
