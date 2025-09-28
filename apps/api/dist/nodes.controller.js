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
import { Controller, Get, Post, Patch, Delete, Param, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { pool } from './db.js';
import { audit } from './audit.js';
import { Authz, RbacGuard } from './authz/rbac.guard.js';
const TYPES = new Set(['org', 'client', 'company', 'department', 'team', 'group']);
function normSlug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'node'; }
let NodesController = class NodesController {
    async get(id) {
        const c = await pool.connect();
        try {
            const r = await c.query('select id,type,slug,name,parent_id,path::text as path,attrs from authz.nodes where id=$1 and deleted_at is null', [id]);
            const row = r.rows[0];
            if (!row)
                throw new BadRequestException('not found');
            return row;
        }
        finally {
            c.release();
        }
    }
    async children(id) {
        const c = await pool.connect();
        try {
            const r = await c.query('select id,type,slug,name,parent_id,path::text as path,attrs from authz.nodes where parent_id=$1 and deleted_at is null order by slug asc', [id]);
            return { rows: r.rows };
        }
        finally {
            c.release();
        }
    }
    async create(body, req) {
        const { id, type, slug, name, parent_id, attrs } = body || {};
        if (!TYPES.has(String(type)))
            throw new BadRequestException('invalid type');
        if (!name)
            throw new BadRequestException('name required');
        const c = await pool.connect();
        try {
            let parentPath = null;
            if (parent_id) {
                const p = await c.query('select path::text as path from authz.nodes where id=$1', [parent_id]);
                parentPath = p.rows[0]?.path || null;
                if (!parentPath)
                    throw new BadRequestException('invalid parent_id');
            }
            const s = normSlug(slug || name);
            const path = parentPath ? `${parentPath}.${s}` : s;
            const sql = 'insert into authz.nodes(id,type,slug,name,parent_id,path,attrs) values (coalesce($1,gen_random_uuid()),$2,$3,$4,$5,$6::ltree,$7::jsonb) returning id,type,slug,name,parent_id,path::text as path,attrs';
            const { rows } = await c.query(sql, [id || null, type, s, name, parent_id || null, path, attrs || {}]);
            await audit(req, 'create', 'authz.node', rows[0]?.id, null, rows[0]);
            return rows[0];
        }
        finally {
            c.release();
        }
    }
    async update(id, body, req) {
        const { name, attrs } = body || {};
        if (!name && !attrs)
            throw new BadRequestException('nothing to update');
        const c = await pool.connect();
        try {
            const before = (await c.query('select id,type,slug,name,parent_id,path::text as path,attrs from authz.nodes where id=$1', [id])).rows[0];
            const { rows } = await c.query('update authz.nodes set name=coalesce($2,name), attrs=coalesce($3::jsonb,attrs) where id=$1 returning id,type,slug,name,parent_id,path::text as path,attrs', [id, name || null, attrs || null]);
            const row = rows[0];
            if (!row)
                throw new BadRequestException('not found');
            await audit(req, 'update', 'authz.node', id, before, row);
            return row;
        }
        finally {
            c.release();
        }
    }
    async remove(id, req) {
        const c = await pool.connect();
        try {
            const before = (await c.query('select id,type,slug,name,parent_id,path::text as path,attrs from authz.nodes where id=$1', [id])).rows[0];
            const r = await c.query('update authz.nodes set deleted_at=now() where id=$1 returning id', [id]);
            if (!r.rows[0])
                throw new BadRequestException('not found');
            await audit(req, 'delete', 'authz.node', id, before, null);
            return { ok: true };
        }
        finally {
            c.release();
        }
    }
};
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NodesController.prototype, "get", null);
__decorate([
    Get(':id/children'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NodesController.prototype, "children", null);
__decorate([
    Post(),
    Authz({ action: 'create', domain: 'node', resourceType: 'client', resourceParam: 'parent_id' }),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NodesController.prototype, "create", null);
__decorate([
    Patch(':id'),
    Authz({ action: 'update', domain: 'node', resourceType: 'client', resourceParam: 'id' }),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], NodesController.prototype, "update", null);
__decorate([
    Delete(':id'),
    Authz({ action: 'delete', domain: 'node', resourceType: 'client', resourceParam: 'id' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NodesController.prototype, "remove", null);
NodesController = __decorate([
    Controller('nodes'),
    UseGuards(RbacGuard)
], NodesController);
export { NodesController };
