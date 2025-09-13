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
import { Controller, Get, Post, Body, Query, BadRequestException, ForbiddenException, Req } from '@nestjs/common';
import { pool } from './db.js';
let ProjectMembersController = class ProjectMembersController {
    async list(req, projectId, projectCode) {
        const org = req.auth?.orgUUID;
        if (!org)
            throw new BadRequestException('org required');
        const perms = req.auth?.perms || [];
        if (!perms.includes('manage_members') && !perms.includes('admin'))
            throw new ForbiddenException('manage_members required');
        const client = await pool.connect();
        try {
            let pid = projectId || null;
            if (!pid && projectCode) {
                const r = await client.query('select id from projects where org_id=$1 and code=$2', [org, projectCode]);
                pid = r.rows[0]?.id || null;
            }
            if (!pid)
                throw new BadRequestException('projectId or projectCode required');
            const { rows } = await client.query(`select pm.user_id, pm.role, pm.created_at, u.email, u.username
         from project_members pm join users u on u.id=pm.user_id
         where pm.project_id=$1 order by u.email asc`, [pid]);
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
        const { projectId, projectCode, identifier, role = 'contributor', role_id } = body || {};
        const client = await pool.connect();
        try {
            let pid = projectId || null;
            if (!pid && projectCode) {
                const r = await client.query('select id from projects where org_id=$1 and code=$2', [org, projectCode]);
                pid = r.rows[0]?.id || null;
            }
            if (!pid)
                throw new BadRequestException('projectId or projectCode required');
            if (!identifier)
                throw new BadRequestException('identifier required');
            // Enforce that the user belongs to the same client as the project (prevents cross-client membership)
            const proj = await client.query('select client_id from projects where id=$1 and org_id=$2', [pid, org]);
            const projectClientId = proj.rows[0]?.client_id || null;
            if (!projectClientId)
                throw new BadRequestException('project has no client');
            const ident = String(identifier).toLowerCase();
            const u = await client.query('select id from users where lower(email)=$1 or lower(username)=lower($2)', [ident, identifier]);
            const user = u.rows[0];
            if (!user)
                throw new BadRequestException('user not found');
            const cm = await client.query('select 1 from client_members where user_id=$1 and client_id=$2', [user.id, projectClientId]);
            if (!cm.rows[0])
                throw new BadRequestException('user not in client for project');
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
            await client.query('insert into project_members(user_id, project_id, role, role_id) values ($1,$2,$3,$4) on conflict (user_id, project_id) do update set role=excluded.role, role_id=excluded.role_id', [user.id, pid, role, rid]);
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
    __param(1, Query('projectId')),
    __param(2, Query('projectCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ProjectMembersController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectMembersController.prototype, "add", null);
ProjectMembersController = __decorate([
    Controller('project-members')
], ProjectMembersController);
export { ProjectMembersController };
