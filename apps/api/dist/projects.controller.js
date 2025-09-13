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
import { getClientForReq } from './db.js';
import { audit } from './audit.js';
let ProjectsController = class ProjectsController {
    async mine(req) {
        const org = req.auth?.orgUUID;
        if (!org)
            throw new BadRequestException('org required');
        const userId = req.auth?.userId;
        const perms = req.auth?.perms || [];
        const clientId = req.auth?.clientId;
        const client = await getClientForReq(req);
        try {
            if (perms.includes('manage_projects') || perms.includes('admin')) {
                const { rows } = await client.query('select id, code, name from projects where org_id=$1 order by name asc', [org]);
                return { rows };
            }
            // Client-scoped users: restrict to projects under their client
            if (clientId) {
                const { rows } = await client.query(`select p.id, p.code, p.name
           from projects p
           join project_members pm on pm.project_id=p.id and pm.user_id=$1
           where p.org_id=$2 and p.client_id=$3
           group by p.id
           order by p.name asc`, [userId, org, clientId]);
                return { rows };
            }
            const { rows } = await client.query(`select p.id, p.code, p.name
         from projects p
         join project_members pm on pm.project_id=p.id and pm.user_id=$1
         where p.org_id=$2
         group by p.id
         order by p.name asc`, [userId, org]);
            return { rows };
        }
        finally {
            client.release();
        }
    }
    async list(req) {
        const org = req.auth?.orgUUID;
        if (!org)
            throw new BadRequestException('org required');
        const perms = req.auth?.perms || [];
        if (!perms.includes('manage_projects') && !perms.includes('admin'))
            throw new ForbiddenException('manage_projects required');
        const client = await getClientForReq(req);
        try {
            const url = new URL(req.url, 'http://local');
            const q = url.searchParams.get('q') || '';
            const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || '20')));
            const offset = Math.max(0, Number(url.searchParams.get('offset') || '0'));
            let sql = 'select p.id, p.code, p.name, p.created_at, p.client_id, c.code as client_code from projects p left join clients c on c.id=p.client_id where p.org_id=$1';
            const args = [org];
            if (q) {
                args.push(`%${q.toLowerCase()}%`);
                sql += ` and (lower(p.code) like $${args.length} or lower(p.name) like $${args.length})`;
            }
            sql += ' order by p.created_at desc';
            sql += ` limit ${limit} offset ${offset}`;
            const { rows } = await client.query(sql, args);
            return { rows, limit, offset, q };
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
        if (!perms.includes('manage_projects') && !perms.includes('admin'))
            throw new ForbiddenException('manage_projects required');
        const { code, name, client_code } = body || {};
        if (!name)
            throw new BadRequestException('name required');
        const client = await getClientForReq(req);
        try {
            let clientId = null;
            if (client_code) {
                const c = await client.query('select id from clients where org_id=$1 and code=$2', [org, String(client_code).toLowerCase()]);
                clientId = c.rows[0]?.id || null;
                if (!clientId)
                    throw new BadRequestException('invalid client_code');
            }
            const { rows } = await client.query('insert into projects(org_id, client_id, code, name) values ($1,$2,$3,$4) returning id, code, name, created_at, client_id', [org, clientId, code || null, name]);
            const proj = rows[0];
            await audit(req, 'create', 'project', proj.id, null, proj);
            return proj;
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
], ProjectsController.prototype, "mine", null);
__decorate([
    Get(),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "create", null);
ProjectsController = __decorate([
    Controller('projects')
], ProjectsController);
export { ProjectsController };
