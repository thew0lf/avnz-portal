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
import { enc } from './crypto.util.js';
import { sendRawEmail } from './mailer.js';
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
    async listRoutes(_nodeId, q, limit, offset, includeDeleted) { const c = await pool.connect(); try {
        const lim = Math.max(1, Math.min(200, Number(limit || '20')));
        const off = Math.max(0, Number(offset || '0'));
        let sql = 'select id,method,path,domain,resource_type,action_name,resource_param,deleted_at from authz.route_registry';
        const args = [];
        const cond = [];
        if (!String(includeDeleted || '').match(/^(1|true)$/i))
            cond.push('deleted_at is null');
        if (q) {
            args.push(`%${q.toLowerCase()}%`);
            cond.push(`lower(path) like $${args.length}`);
        }
        if (cond.length)
            sql += ' where ' + cond.join(' and ');
        sql += ' order by path limit ' + lim + ' offset ' + off;
        const r = await c.query(sql, args);
        return { rows: r.rows, limit: lim, offset: off, q: q || '', include_deleted: !!String(includeDeleted || '').match(/^(1|true)$/i) };
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
        await c.query('update authz.route_registry set deleted_at=now() where id=$1', [id]);
        await audit(req, 'delete', 'authz.route', id, before, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    async restoreRoute(id, req) { const c = await pool.connect(); try {
        await c.query('update authz.route_registry set deleted_at=null where id=$1', [id]);
        await audit(req, 'restore', 'authz.route', id, null, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    // Templates CRUD (email/sms)
    async listEmailTemplates(key, client_id, includeDeleted) { const c = await pool.connect(); try {
        const args = [];
        let sql = 'select id, key, client_id, subject, body, body_html, body_mjml, created_at, updated_at, deleted_at from email_templates';
        const cond = [];
        if (!String(includeDeleted || '').match(/^(1|true)$/i))
            cond.push('deleted_at is null');
        if (key) {
            args.push(key);
            cond.push(`key=$${args.length}`);
        }
        if (client_id) {
            args.push(client_id);
            cond.push(`client_id=$${args.length}`);
        }
        if (cond.length)
            sql += ' where ' + cond.join(' and ');
        sql += ' order by key, client_id nulls first';
        const r = await c.query(sql, args);
        return { rows: r.rows, include_deleted: !!String(includeDeleted || '').match(/^(1|true)$/i) };
    }
    finally {
        c.release();
    } }
    async upsertEmailTemplate(b, req) { const { id, key, client_id, subject, body, body_html, body_mjml } = b || {}; if (!key || !subject)
        throw new BadRequestException('key, subject required'); const c = await pool.connect(); try {
        const r = await c.query('insert into email_templates(id,key,client_id,subject,body,body_html,body_mjml) values (coalesce($1,gen_random_uuid()),$2,$3,$4,$5,$6,$7) on conflict (id) do update set key=excluded.key, client_id=excluded.client_id, subject=excluded.subject, body=excluded.body, body_html=excluded.body_html, body_mjml=excluded.body_mjml, updated_at=now() returning id,key,client_id,subject,body,body_html,body_mjml', [id || null, key, client_id || null, subject, body || null, body_html || null, body_mjml || null]);
        await audit(req, 'upsert', 'template.email', r.rows[0]?.id, null, r.rows[0]);
        return r.rows[0];
    }
    finally {
        c.release();
    } }
    async previewEmail(b, req) {
        const { to, subject, body, body_html, client_id } = b || {};
        if (!to || !subject || (!body && !body_html))
            throw new BadRequestException('to, subject and body or body_html required');
        const orgId = req?.auth?.orgId || null;
        const r = await sendRawEmail(String(to), String(subject), String(body || ''), body_html ? String(body_html) : undefined, { orgId: orgId || undefined, clientId: client_id || undefined });
        await audit(req, 'send', 'template.email.preview', null, null, { to, subject, from: r?.from });
        return { ok: true, from: r?.from };
    }
    async delEmailTemplate(id, req) { const c = await pool.connect(); try {
        const before = (await c.query('select * from email_templates where id=$1', [id])).rows[0];
        await c.query('update email_templates set deleted_at=now() where id=$1', [id]);
        await audit(req, 'delete', 'template.email', id, before, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    async restoreEmailTemplate(id, req) { const c = await pool.connect(); try {
        await c.query('update email_templates set deleted_at=null where id=$1', [id]);
        await audit(req, 'restore', 'template.email', id, null, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    async listSmsTemplates(key, client_id, includeDeleted) { const c = await pool.connect(); try {
        const args = [];
        let sql = 'select id, key, client_id, body, created_at, updated_at, deleted_at from sms_templates';
        const cond = [];
        if (!String(includeDeleted || '').match(/^(1|true)$/i))
            cond.push('deleted_at is null');
        if (key) {
            args.push(key);
            cond.push(`key=$${args.length}`);
        }
        if (client_id) {
            args.push(client_id);
            cond.push(`client_id=$${args.length}`);
        }
        if (cond.length)
            sql += ' where ' + cond.join(' and ');
        sql += ' order by key, client_id nulls first';
        const r = await c.query(sql, args);
        return { rows: r.rows, include_deleted: !!String(includeDeleted || '').match(/^(1|true)$/i) };
    }
    finally {
        c.release();
    } }
    async upsertSmsTemplate(b, req) { const { id, key, client_id, body } = b || {}; if (!key || !body)
        throw new BadRequestException('key, body required'); const c = await pool.connect(); try {
        const r = await c.query('insert into sms_templates(id,key,client_id,body) values (coalesce($1,gen_random_uuid()),$2,$3,$4) on conflict (id) do update set key=excluded.key, client_id=excluded.client_id, body=excluded.body, updated_at=now() returning id,key,client_id,body', [id || null, key, client_id || null, body]);
        await audit(req, 'upsert', 'template.sms', r.rows[0]?.id, null, r.rows[0]);
        return r.rows[0];
    }
    finally {
        c.release();
    } }
    async delSmsTemplate(id, req) { const c = await pool.connect(); try {
        const before = (await c.query('select * from sms_templates where id=$1', [id])).rows[0];
        await c.query('update sms_templates set deleted_at=now() where id=$1', [id]);
        await audit(req, 'delete', 'template.sms', id, before, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    async restoreSmsTemplate(id, req) { const c = await pool.connect(); try {
        await c.query('update sms_templates set deleted_at=null where id=$1', [id]);
        await audit(req, 'restore', 'template.sms', id, null, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    // Service configuration (encrypted)
    async listServiceConfigs(nodeId, service, client_id, includeDeleted) { const c = await pool.connect(); try {
        const args = [nodeId || null];
        let sql = 'select id, org_id, client_id, service, name, created_at, updated_at, deleted_at from service_configs where org_id=$1';
        const cond = [];
        if (!String(includeDeleted || '').match(/^(1|true)$/i))
            cond.push('deleted_at is null');
        if (service) {
            args.push(service);
            cond.push(`service=$${args.length}`);
        }
        if (client_id) {
            args.push(client_id);
            cond.push(`client_id=$${args.length}`);
        }
        if (cond.length)
            sql += ' and ' + cond.join(' and ');
        sql += ' order by service, name';
        const r = await c.query(sql, args);
        return { rows: r.rows, include_deleted: !!String(includeDeleted || '').match(/^(1|true)$/i) };
    }
    finally {
        c.release();
    } }
    async upsertServiceConfig(b, nodeId, req) { const { id, service, name, value, client_id } = b || {}; if (!service || !name || typeof value !== 'string')
        throw new BadRequestException('service, name, value required'); const secret = process.env.AUTH_SECRET || 'dev-secret-change-me'; const value_enc = enc(value, secret); const c = await pool.connect(); try {
        const r = await c.query('insert into service_configs(id,org_id,client_id,service,name,value_enc) values (coalesce($1,gen_random_uuid()),$2,$3,$4,$5,$6) on conflict (org_id,client_id,service,name) do update set value_enc=excluded.value_enc, updated_at=now() returning id, org_id, client_id, service, name, created_at, updated_at', [id || null, nodeId, client_id || null, service, name, value_enc]);
        await audit(req, 'upsert', 'service.config', r.rows[0]?.id, null, { service, name, client_id: client_id || null });
        return r.rows[0];
    }
    finally {
        c.release();
    } }
    async delServiceConfig(id, req) { const c = await pool.connect(); try {
        const before = (await c.query('select * from service_configs where id=$1', [id])).rows[0];
        await c.query('update service_configs set deleted_at=now() where id=$1', [id]);
        await audit(req, 'delete', 'service.config', id, before, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    async restoreServiceConfig(id, req) { const c = await pool.connect(); try {
        await c.query('update service_configs set deleted_at=null where id=$1', [id]);
        await audit(req, 'restore', 'service.config', id, null, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    // Budget
    async getBudget(nodeId) {
        const id = String(nodeId || '').trim();
        if (!id || !/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/i.test(id)) {
            throw new BadRequestException('missing_or_invalid_nodeId');
        }
        const c = await pool.connect();
        try {
            const r = await c.query('select monthly_limit_usd from budgets where org_id=$1', [id]);
            return { monthly_limit_usd: r.rows[0]?.monthly_limit_usd || 0 };
        }
        finally {
            c.release();
        }
    }
    async setBudget(nodeId, b) {
        const id = String(nodeId || '').trim();
        if (!id || !/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/i.test(id)) {
            throw new BadRequestException('missing_or_invalid_nodeId');
        }
        const limit = Number(b?.monthly_limit_usd || 0);
        const c = await pool.connect();
        try {
            await c.query('insert into budgets(org_id, monthly_limit_usd) values ($1,$2) on conflict (org_id) do update set monthly_limit_usd=excluded.monthly_limit_usd, updated_at=now()', [id, limit]);
            return { ok: true };
        }
        finally {
            c.release();
        }
    }
    // Roles
    async listRoles(_nodeId, q, limit, offset, includeDeleted) { const c = await pool.connect(); try {
        const lim = Math.max(1, Math.min(200, Number(limit || '20')));
        const off = Math.max(0, Number(offset || '0'));
        let sql = 'select id,name,level,deleted_at from authz.roles';
        const args = [];
        const cond = [];
        if (!String(includeDeleted || '').match(/^(1|true)$/i))
            cond.push('deleted_at is null');
        if (q) {
            args.push(`%${q.toLowerCase()}%`);
            cond.push(`lower(name) like $${args.length}`);
        }
        if (cond.length)
            sql += ' where ' + cond.join(' and ');
        sql += ' order by level desc limit ' + lim + ' offset ' + off;
        const r = await c.query(sql, args);
        return { rows: r.rows, limit: lim, offset: off, q: q || '', include_deleted: !!String(includeDeleted || '').match(/^(1|true)$/i) };
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
        await c.query('update authz.roles set deleted_at=now() where id=$1', [id]);
        await audit(req, 'delete', 'authz.role', id, before, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    async restoreRole(id, req) { const c = await pool.connect(); try {
        await c.query('update authz.roles set deleted_at=null where id=$1', [id]);
        await audit(req, 'restore', 'authz.role', id, null, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    // Actions
    async listActions(_nodeId, q, limit, offset, includeDeleted) { const c = await pool.connect(); try {
        const lim = Math.max(1, Math.min(200, Number(limit || '20')));
        const off = Math.max(0, Number(offset || '0'));
        let sql = 'select name,deleted_at from authz.actions';
        const args = [];
        const cond = [];
        if (!String(includeDeleted || '').match(/^(1|true)$/i))
            cond.push('deleted_at is null');
        if (q) {
            args.push(`%${q.toLowerCase()}%`);
            cond.push(`lower(name) like $${args.length}`);
        }
        if (cond.length)
            sql += ' where ' + cond.join(' and ');
        sql += ' order by name asc limit ' + lim + ' offset ' + off;
        const r = await c.query(sql, args);
        return { rows: r.rows, limit: lim, offset: off, q: q || '', include_deleted: !!String(includeDeleted || '').match(/^(1|true)$/i) };
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
        await c.query('update authz.actions set deleted_at=now() where name=$1', [name]);
        await audit(req, 'delete', 'authz.action', name, null, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    async restoreAction(name, req) { const c = await pool.connect(); try {
        await c.query('update authz.actions set deleted_at=null where name=$1', [name]);
        await audit(req, 'restore', 'authz.action', name, null, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    // Permissions
    async listPerms(_nodeId, q, limit, offset, includeDeleted) { const c = await pool.connect(); try {
        const lim = Math.max(1, Math.min(200, Number(limit || '20')));
        const off = Math.max(0, Number(offset || '0'));
        let sql = 'select id,domain,resource_type,action_name,min_role_id,deleted_at from authz.permissions';
        const args = [];
        const cond = [];
        if (!String(includeDeleted || '').match(/^(1|true)$/i))
            cond.push('deleted_at is null');
        if (q) {
            args.push(`%${q.toLowerCase()}%`);
            cond.push("lower(domain)||'.'||lower(resource_type)||'.'||lower(action_name) like $" + args.length);
        }
        if (cond.length)
            sql += ' where ' + cond.join(' and ');
        sql += ' order by domain,resource_type,action_name limit ' + lim + ' offset ' + off;
        const r = await c.query(sql, args);
        return { rows: r.rows, limit: lim, offset: off, q: q || '', include_deleted: !!String(includeDeleted || '').match(/^(1|true)$/i) };
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
        await c.query('update authz.permissions set deleted_at=now() where id=$1', [id]);
        await audit(req, 'delete', 'authz.permission', id, before, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    async restorePerm(id, req) { const c = await pool.connect(); try {
        await c.query('update authz.permissions set deleted_at=null where id=$1', [id]);
        await audit(req, 'restore', 'authz.permission', id, null, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    // Role assignments
    async listAssignments(userId, nodeId, limit, offset, includeDeleted) { const c = await pool.connect(); try {
        const lim = Math.max(1, Math.min(200, Number(limit || '20')));
        const off = Math.max(0, Number(offset || '0'));
        const args = [];
        let where = '';
        const cond = [];
        if (!String(includeDeleted || '').match(/^(1|true)$/i))
            cond.push('deleted_at is null');
        if (userId) {
            args.push(userId);
            cond.push(`user_id=$${args.length}`);
        }
        if (nodeId) {
            args.push(nodeId);
            cond.push(`node_id=$${args.length}`);
        }
        if (cond.length)
            where = ' where ' + cond.join(' and ');
        const r = await c.query(`select id,user_id,node_id,role_id,constraints,deleted_at from authz.role_assignments${where} order by user_id,node_id limit ${lim} offset ${off}`, args);
        return { rows: r.rows, limit: lim, offset: off, include_deleted: !!String(includeDeleted || '').match(/^(1|true)$/i) };
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
        await c.query('update authz.role_assignments set deleted_at=now() where id=$1', [id]);
        await audit(req, 'delete', 'authz.role_assignment', id, before, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    async restoreAssignment(id, req) { const c = await pool.connect(); try {
        await c.query('update authz.role_assignments set deleted_at=null where id=$1', [id]);
        await audit(req, 'restore', 'authz.role_assignment', id, null, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    // ABAC fences
    async listAbac(_nodeId, includeDeleted) { const c = await pool.connect(); try {
        const cond = String(includeDeleted || '').match(/^(1|true)$/i) ? '' : ' where deleted_at is null';
        const r = await c.query(`select id,action_name,expr,deleted_at from authz.abac_fences${cond} order by action_name`);
        return { rows: r.rows, include_deleted: !!String(includeDeleted || '').match(/^(1|true)$/i) };
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
        await c.query('update authz.abac_fences set deleted_at=now() where id=$1', [id]);
        await audit(req, 'delete', 'authz.abac', id, before, null);
        return { ok: true };
    }
    finally {
        c.release();
    } }
    async restoreAbac(id, req) { const c = await pool.connect(); try {
        await c.query('update authz.abac_fences set deleted_at=null where id=$1', [id]);
        await audit(req, 'restore', 'authz.abac', id, null, null);
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
    __param(4, Query('include_deleted')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
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
    Post('routes/:id/restore'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "restoreRoute", null);
__decorate([
    Get('templates/email'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('key')),
    __param(1, Query('client_id')),
    __param(2, Query('include_deleted')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listEmailTemplates", null);
__decorate([
    Post('templates/email'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "upsertEmailTemplate", null);
__decorate([
    Post('templates/email/preview'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "previewEmail", null);
__decorate([
    Delete('templates/email/:id'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "delEmailTemplate", null);
__decorate([
    Post('templates/email/:id/restore'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "restoreEmailTemplate", null);
__decorate([
    Get('templates/sms'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('key')),
    __param(1, Query('client_id')),
    __param(2, Query('include_deleted')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listSmsTemplates", null);
__decorate([
    Post('templates/sms'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "upsertSmsTemplate", null);
__decorate([
    Delete('templates/sms/:id'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "delSmsTemplate", null);
__decorate([
    Post('templates/sms/:id/restore'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "restoreSmsTemplate", null);
__decorate([
    Get('services/configs'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('nodeId')),
    __param(1, Query('service')),
    __param(2, Query('client_id')),
    __param(3, Query('include_deleted')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listServiceConfigs", null);
__decorate([
    Post('services/configs'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Body()),
    __param(1, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "upsertServiceConfig", null);
__decorate([
    Delete('services/configs/:id'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "delServiceConfig", null);
__decorate([
    Post('services/configs/:id/restore'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "restoreServiceConfig", null);
__decorate([
    Get('budget'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getBudget", null);
__decorate([
    Post('budget'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('nodeId')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setBudget", null);
__decorate([
    Get('roles'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('nodeId')),
    __param(1, Query('q')),
    __param(2, Query('limit')),
    __param(3, Query('offset')),
    __param(4, Query('include_deleted')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
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
    Post('roles/:id/restore'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "restoreRole", null);
__decorate([
    Get('actions'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('nodeId')),
    __param(1, Query('q')),
    __param(2, Query('limit')),
    __param(3, Query('offset')),
    __param(4, Query('include_deleted')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
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
    Post('actions/:name/restore'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "restoreAction", null);
__decorate([
    Get('permissions'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('nodeId')),
    __param(1, Query('q')),
    __param(2, Query('limit')),
    __param(3, Query('offset')),
    __param(4, Query('include_deleted')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
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
    Post('permissions/:id/restore'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "restorePerm", null);
__decorate([
    Get('assignments'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('userId')),
    __param(1, Query('nodeId')),
    __param(2, Query('limit')),
    __param(3, Query('offset')),
    __param(4, Query('include_deleted')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
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
    Post('assignments/:id/restore'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "restoreAssignment", null);
__decorate([
    Get('abac'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Query('nodeId')),
    __param(1, Query('include_deleted')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
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
__decorate([
    Post('abac/:id/restore'),
    Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "restoreAbac", null);
AdminController = __decorate([
    Controller('admin'),
    UseGuards(RbacGuard)
], AdminController);
export { AdminController };
