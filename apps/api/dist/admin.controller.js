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
import { Controller, Get, Post, Patch, Delete, Param, Body, BadRequestException, Query, UseGuards } from '@nestjs/common';
import { pool } from './db.js';
import { Authz, RbacGuard } from './authz/rbac.guard.js';
import { audit } from './audit.js';
let AdminController = class AdminController {
    // Security settings
    async getSec(_nodeId) { const c = await pool.connect(); try {
        const r = await c.query('select require_mfa,password_policy,audit_retention_days from security_settings where id=1');
        return r.rows[0];
    }
    finally {
        c.release();
    } }
    async setSec(b, _nodeId) { const { require_mfa, password_policy, audit_retention_days } = b || {}; const c = await pool.connect(); try {
        await c.query('update security_settings set require_mfa=coalesce($1,require_mfa), password_policy=coalesce($2::jsonb,password_policy), audit_retention_days=coalesce($3,audit_retention_days), updated_at=now() where id=1', [require_mfa, password_policy ? JSON.stringify(password_policy) : null, audit_retention_days || null]);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    // Route registry CRUD
    async listRoutes(_nodeId, q, limit, offset) { const c = await pool.connect(); try {
        const lim = Math.max(1, Math.min(200, Number(limit || '20')));
        const off = Math.max(0, Number(offset || '0'));
        let sql = 'select id,method,path,domain,resource_type,action_name,resource_param from authz.route_registry';
        const args = [];
        if (q) {
            args.push(`%${q.toLowerCase()}%`);
            sql += ' where lower(path) like $1';
        }
        sql += ' order by path limit ' + lim + ' offset ' + off;
        const r = await c.query(sql, args);
        return { rows: r.rows, limit: lim, offset: off, q: q || '' };
    }
    finally {
        c.release();
    } }
    async createRoute(b, _nodeId, req) { const { id, method, path, domain, resource_type, action_name, resource_param } = b || {}; if (!method || !path || !domain || !resource_type || !action_name)
        throw new BadRequestException('missing'); const c = await pool.connect(); try {
        const r = await c.query('insert into authz.route_registry(id,method,path,domain,resource_type,action_name,resource_param) values (coalesce($1,gen_random_uuid()),$2,$3,$4,$5,$6,$7) on conflict (method,path) do update set domain=excluded.domain, resource_type=excluded.resource_type, action_name=excluded.action_name, resource_param=excluded.resource_param returning id,method,path,domain,resource_type,action_name,resource_param', [id || null, method.toUpperCase(), path, domain, resource_type, action_name, resource_param || null]);
        await audit(req, 'upsert', 'authz.route', r.rows[0]?.id, null, r.rows[0]);
        return r.rows[0];
    }
    finally {
        c.release();
    } }
    async deleteRoute(id, _nodeId, req) { const c = await pool.connect(); try {
        const before = (await c.query('select * from authz.route_registry where id=$1', [id])).rows[0];
        await c.query('delete from authz.route_registry where id=$1', [id]);
        await audit(req, 'delete', 'authz.route', id, before, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    // Roles
    async listRoles(_nodeId, q, limit, offset) { const c = await pool.connect(); try {
        const lim = Math.max(1, Math.min(200, Number(limit || '20')));
        const off = Math.max(0, Number(offset || '0'));
        let sql = 'select id,name,level from authz.roles';
        const args = [];
        if (q) {
            args.push(`%${q.toLowerCase()}%`);
            sql += ' where lower(name) like $1';
        }
        sql += ' order by level desc limit ' + lim + ' offset ' + off;
        const r = await c.query(sql, args);
        return { rows: r.rows, limit: lim, offset: off, q: q || '' };
    }
    finally {
        c.release();
    } }
    async createRole(b, _nodeId, _p, _q, _body2, req) { const { id, name, level } = b || {}; if (!name || typeof level !== 'number')
        throw new BadRequestException('name, level required'); const c = await pool.connect(); try {
        const r = await c.query('insert into authz.roles(id,name,level) values (coalesce($1,gen_random_uuid()),$2,$3) returning id,name,level', [id || null, name, level]);
        await audit(req, 'create', 'authz.role', r.rows[0]?.id, null, r.rows[0]);
        return r.rows[0];
    }
    finally {
        c.release();
    } }
    async updateRole(id, b, _nodeId, req) { const { name, level } = b || {}; if (!name && typeof level !== 'number')
        throw new BadRequestException('nothing to update'); const c = await pool.connect(); try {
        const before = (await c.query('select id,name,level from authz.roles where id=$1', [id])).rows[0];
        const r = await c.query('update authz.roles set name=coalesce($2,name), level=coalesce($3,level) where id=$1 returning id,name,level', [id, name || null, typeof level === 'number' ? level : null]);
        const row = r.rows[0];
        if (!row)
            throw new BadRequestException('not found');
        await audit(req, 'update', 'authz.role', id, before, row);
        return row;
    }
    finally {
        c.release();
    } }
    async deleteRole(id, _nodeId, req) { const c = await pool.connect(); try {
        const before = (await c.query('select id,name,level from authz.roles where id=$1', [id])).rows[0];
        await c.query('delete from authz.roles where id=$1', [id]);
        await audit(req, 'delete', 'authz.role', id, before, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    // Actions
    async listActions(_nodeId, q, limit, offset) { const c = await pool.connect(); try {
        const lim = Math.max(1, Math.min(200, Number(limit || '20')));
        const off = Math.max(0, Number(offset || '0'));
        let sql = 'select name from authz.actions';
        const args = [];
        if (q) {
            args.push(`%${q.toLowerCase()}%`);
            sql += ' where lower(name) like $1';
        }
        sql += ' order by name asc limit ' + lim + ' offset ' + off;
        const r = await c.query(sql, args);
        return { rows: r.rows, limit: lim, offset: off, q: q || '' };
    }
    finally {
        c.release();
    } }
    async createAction(b, _nodeId, req) { const { name } = b || {}; if (!name)
        throw new BadRequestException('name required'); const c = await pool.connect(); try {
        const r = await c.query('insert into authz.actions(name) values ($1) on conflict do nothing returning name', [name]);
        await audit(req, 'create', 'authz.action', name, null, r.rows[0] || { name });
        return r.rows[0] || { name };
    }
    finally {
        c.release();
    } }
    async deleteAction(name, _nodeId, req) { const c = await pool.connect(); try {
        await c.query('delete from authz.actions where name=$1', [name]);
        await audit(req, 'delete', 'authz.action', name, null, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    // Permissions
    async listPerms(_nodeId, q, limit, offset) { const c = await pool.connect(); try {
        const lim = Math.max(1, Math.min(200, Number(limit || '20')));
        const off = Math.max(0, Number(offset || '0'));
        let sql = 'select id,domain,resource_type,action_name,min_role_id from authz.permissions';
        const args = [];
        if (q) {
            args.push(`%${q.toLowerCase()}%`);
            sql += " where lower(domain)||'.'||lower(resource_type)||'.'||lower(action_name) like $1";
        }
        sql += ' order by domain,resource_type,action_name limit ' + lim + ' offset ' + off;
        const r = await c.query(sql, args);
        return { rows: r.rows, limit: lim, offset: off, q: q || '' };
    }
    finally {
        c.release();
    } }
    async createPerm(b, _nodeId, req) { const { id, domain, resource_type, action_name, min_role_id } = b || {}; if (!domain || !resource_type || !action_name || !min_role_id)
        throw new BadRequestException('missing fields'); const c = await pool.connect(); try {
        const before = (await c.query('select id,domain,resource_type,action_name,min_role_id from authz.permissions where domain=$1 and resource_type=$2 and action_name=$3', [domain, resource_type, action_name])).rows[0];
        const r = await c.query('insert into authz.permissions(id,domain,resource_type,action_name,min_role_id) values (coalesce($1,gen_random_uuid()),$2,$3,$4,$5) on conflict (domain,resource_type,action_name) do update set min_role_id=excluded.min_role_id returning id,domain,resource_type,action_name,min_role_id', [id || null, domain, resource_type, action_name, min_role_id]);
        await audit(req, before ? 'update' : 'create', 'authz.permission', r.rows[0]?.id, before, r.rows[0]);
        return r.rows[0];
    }
    finally {
        c.release();
    } }
    async updatePerm(id, b, _nodeId, req) { const { min_role_id } = b || {}; if (!min_role_id)
        throw new BadRequestException('min_role_id required'); const c = await pool.connect(); try {
        const before = (await c.query('select id,domain,resource_type,action_name,min_role_id from authz.permissions where id=$1', [id])).rows[0];
        const r = await c.query('update authz.permissions set min_role_id=$2 where id=$1 returning id,domain,resource_type,action_name,min_role_id', [id, min_role_id]);
        const row = r.rows[0];
        if (!row)
            throw new BadRequestException('not found');
        await audit(req, 'update', 'authz.permission', id, before, row);
        return row;
    }
    finally {
        c.release();
    } }
    async deletePerm(id, _nodeId, req) { const c = await pool.connect(); try {
        const before = (await c.query('select id,domain,resource_type,action_name,min_role_id from authz.permissions where id=$1', [id])).rows[0];
        await c.query('delete from authz.permissions where id=$1', [id]);
        await audit(req, 'delete', 'authz.permission', id, before, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    // Role assignments
    async listAssignments(userId, nodeId, limit, offset) { const c = await pool.connect(); try {
        const lim = Math.max(1, Math.min(200, Number(limit || '20')));
        const off = Math.max(0, Number(offset || '0'));
        let where = '';
        const args = [];
        if (userId) {
            args.push(userId);
            where += ' where user_id=$' + args.length;
        }
        if (nodeId) {
            args.push(nodeId);
            where += (where ? ' and' : ' where') + ' node_id=$' + args.length;
        }
        const r = await c.query(`select id,user_id,node_id,role_id,constraints from authz.role_assignments${where} order by user_id,node_id limit ${lim} offset ${off}`, args);
        return { rows: r.rows, limit: lim, offset: off };
    }
    finally {
        c.release();
    } }
    async createAssignment(b, _nodeId, req) { const { id, user_id, node_id, role_id, constraints } = b || {}; if (!user_id || !node_id || !role_id)
        throw new BadRequestException('missing fields'); const c = await pool.connect(); try {
        const r = await c.query('insert into authz.role_assignments(id,user_id,node_id,role_id,constraints) values (coalesce($1,gen_random_uuid()),$2,$3,$4,coalesce($5,\'{}\'::jsonb)) on conflict do nothing returning id,user_id,node_id,role_id,constraints', [id || null, user_id, node_id, role_id, JSON.stringify(constraints || {})]);
        const out = r.rows[0] || { id, user_id, node_id, role_id, constraints: constraints || {} };
        await audit(req, 'create', 'authz.role_assignment', out.id, null, out);
        return out;
    }
    finally {
        c.release();
    } }
    async deleteAssignment(id, _nodeId, req) { const c = await pool.connect(); try {
        const before = (await c.query('select * from authz.role_assignments where id=$1', [id])).rows[0];
        await c.query('delete from authz.role_assignments where id=$1', [id]);
        await audit(req, 'delete', 'authz.role_assignment', id, before, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    // ABAC fences
    async listAbac(_nodeId) { const c = await pool.connect(); try {
        const r = await c.query('select id,action_name,expr from authz.abac_fences order by action_name');
        return { rows: r.rows };
    }
    finally {
        c.release();
    } }
    async createAbac(b, _nodeId, req) { const { id, action_name, expr } = b || {}; if (!action_name || !expr)
        throw new BadRequestException('missing fields'); const c = await pool.connect(); try {
        const r = await c.query('insert into authz.abac_fences(id,action_name,expr) values (coalesce($1,gen_random_uuid()),$2,$3::jsonb) returning id,action_name,expr', [id || null, action_name, JSON.stringify(expr)]);
        await audit(req, 'create', 'authz.abac', r.rows[0]?.id, null, r.rows[0]);
        return r.rows[0];
    }
    finally {
        c.release();
    } }
    async updateAbac(id, b, _nodeId, req) { const { expr } = b || {}; if (!expr)
        throw new BadRequestException('expr required'); const c = await pool.connect(); try {
        const before = (await c.query('select * from authz.abac_fences where id=$1', [id])).rows[0];
        const r = await c.query('update authz.abac_fences set expr=$2::jsonb where id=$1 returning id,action_name,expr', [id, JSON.stringify(expr)]);
        const row = r.rows[0];
        if (!row)
            throw new BadRequestException('not found');
        await audit(req, 'update', 'authz.abac', id, before, row);
        return row;
    }
    finally {
        c.release();
    } }
    async deleteAbac(id, _nodeId, req) { const c = await pool.connect(); try {
        const before = (await c.query('select * from authz.abac_fences where id=$1', [id])).rows[0];
        await c.query('delete from authz.abac_fences where id=$1', [id]);
        await audit(req, 'delete', 'authz.abac', id, before, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
};
__decorate([
    Get('security-settings'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSec", null);
__decorate([
    Patch('security-settings'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Body()),
    __param(1, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setSec", null);
__decorate([
    Get('routes'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('nodeId')),
    __param(1, Query('q')),
    __param(2, Query('limit')),
    __param(3, Query('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listRoutes", null);
__decorate([
    Post('routes'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Body()),
    __param(1, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createRoute", null);
__decorate([
    Delete('routes/:id'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __param(1, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteRoute", null);
__decorate([
    Get('roles'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('nodeId')),
    __param(1, Query('q')),
    __param(2, Query('limit')),
    __param(3, Query('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listRoles", null);
__decorate([
    Post('roles'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Body()),
    __param(1, Query('nodeId')),
    __param(2, Param()),
    __param(3, Query()),
    __param(4, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createRole", null);
__decorate([
    Patch('roles/:id'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __param(1, Body()),
    __param(2, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateRole", null);
__decorate([
    Delete('roles/:id'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __param(1, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteRole", null);
__decorate([
    Get('actions'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('nodeId')),
    __param(1, Query('q')),
    __param(2, Query('limit')),
    __param(3, Query('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listActions", null);
__decorate([
    Post('actions'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Body()),
    __param(1, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createAction", null);
__decorate([
    Delete('actions/:name'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('name')),
    __param(1, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteAction", null);
__decorate([
    Get('permissions'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('nodeId')),
    __param(1, Query('q')),
    __param(2, Query('limit')),
    __param(3, Query('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listPerms", null);
__decorate([
    Post('permissions'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Body()),
    __param(1, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createPerm", null);
__decorate([
    Patch('permissions/:id'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __param(1, Body()),
    __param(2, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updatePerm", null);
__decorate([
    Delete('permissions/:id'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __param(1, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deletePerm", null);
__decorate([
    Get('assignments'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('userId')),
    __param(1, Query('nodeId')),
    __param(2, Query('limit')),
    __param(3, Query('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listAssignments", null);
__decorate([
    Post('assignments'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Body()),
    __param(1, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createAssignment", null);
__decorate([
    Delete('assignments/:id'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __param(1, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteAssignment", null);
__decorate([
    Get('abac'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listAbac", null);
__decorate([
    Post('abac'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Body()),
    __param(1, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createAbac", null);
__decorate([
    Patch('abac/:id'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __param(1, Body()),
    __param(2, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateAbac", null);
__decorate([
    Delete('abac/:id'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __param(1, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteAbac", null);
AdminController = __decorate([
    Controller('admin'),
    UseGuards(RbacGuard)
], AdminController);
export { AdminController };
