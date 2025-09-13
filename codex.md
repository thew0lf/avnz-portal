# 🧠 Codex Task — Avnz Dynamic RBAC (Postgres, NestJS, TypeORM)

You are a senior NestJS/TypeScript auth engineer. Build a **dynamic, database-driven** RBAC system for Avnz that models a school hierarchy (org → client → company → department → team → group) with **downward-inheritance** and optional **ABAC** fences.  
**No static policy files. No hard-coded role or action lists.** All policy lives in Postgres and is editable at runtime.

---

## Goals
- Represent the education hierarchy as DB rows (not code constants).
- RBAC decisions are computed at runtime using Postgres (single query + optional ABAC).
- Admins can add/edit **roles**, **actions**, **permissions**, **ABAC fences**, **nodes**, and **assignments** without deploys.
- Provide guards/middleware, admin APIs, and tests.

## Tech & Constraints
- **DB**: Postgres (use `ltree` for ancestor checks).
- **Server**: NestJS + TypeScript + TypeORM.
- **Auth**: JWT; assume `req.user.id` exists.
- **ABAC**: JSONLogic evaluated in app code.
- **Caching**: In-memory TTL + Postgres `LISTEN/NOTIFY` invalidation.
- **Bootstrap (no static seeds)**: allow temporary bypass via env to create first roles/actions/permissions:
  - `RBAC_BOOTSTRAP_MODE=true`
  - `RBAC_BOOTSTRAP_USER_IDS=uuid1,uuid2`

---

## Repository Layout (generate exactly these)
```
/migrations
  001_enable_extensions.sql
  002_schema.sql
  003_notify_triggers.sql

/src
  /entities
    Node.entity.ts
    Role.entity.ts
    Action.entity.ts
    Permission.entity.ts
    RoleAssignment.entity.ts
    AbacFence.entity.ts
  /authz
    authz.module.ts
    authz.service.ts
    rbac.guard.ts
    authz.decorator.ts
    permissions.cache.ts
    abac.ts
  /db
    rbac.sql.ts
    notify.ts
  /nodes
    nodes.controller.ts
    nodes.service.ts
  /admin
    admin.controller.ts
    admin.service.ts
  /authzcheck
    check.controller.ts

/test
  authz.spec.ts

.env.example
package.json
README.md
```

---

## Migrations (required content)

### `001_enable_extensions.sql`
- `CREATE EXTENSION IF NOT EXISTS ltree;`

### `002_schema.sql` (tables must match exactly)
```sql
-- nodes (hierarchy)
CREATE TABLE IF NOT EXISTS nodes (
  id        uuid PRIMARY KEY,
  type      text NOT NULL CHECK (type IN ('org','client','company','department','team','group')),
  slug      text NOT NULL,
  name      text NOT NULL,
  parent_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
  path      ltree NOT NULL,                 -- e.g. 'avnz.florida_doe.broward.msd_high.sci_101.lab_a'
  attrs     jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (parent_id, slug)
);
CREATE INDEX IF NOT EXISTS nodes_path_idx ON nodes USING GIST (path);

-- roles (ordered by privilege)
CREATE TABLE IF NOT EXISTS roles (
  id    uuid PRIMARY KEY,
  name  text UNIQUE NOT NULL,               -- e.g. OrgAdmin, DepartmentManager, TeamOwner, GroupContributor
  level int NOT NULL                        -- higher = more privilege
);

-- actions
CREATE TABLE IF NOT EXISTS actions (
  name text PRIMARY KEY                     -- e.g. manage_roster, read_reports, submit_work
);

-- permissions (min role for action on resource type)
CREATE TABLE IF NOT EXISTS permissions (
  id            uuid PRIMARY KEY,
  domain        text NOT NULL,              -- 'node' | 'content' | 'data' (free-form)
  resource_type text NOT NULL,              -- 'org'|'client'|'company'|'department'|'team'|'group'
  action_name   text NOT NULL REFERENCES actions(name),
  min_role_id   uuid NOT NULL REFERENCES roles(id),
  UNIQUE (domain, resource_type, action_name)
);

-- role assignments (who has which role where)
CREATE TABLE IF NOT EXISTS role_assignments (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL,
  node_id     uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  role_id     uuid NOT NULL REFERENCES roles(id),
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb, -- ABAC fences at membership layer
  UNIQUE (user_id, node_id, role_id)
);
CREATE INDEX IF NOT EXISTS ra_user_idx ON role_assignments(user_id);
CREATE INDEX IF NOT EXISTS ra_node_idx ON role_assignments(node_id);

-- ABAC fences (optional)
CREATE TABLE IF NOT EXISTS abac_fences (
  id          uuid PRIMARY KEY,
  action_name text NOT NULL REFERENCES actions(name),
  expr        jsonb NOT NULL                 -- JSONLogic expression
);
```

### `003_notify_triggers.sql`
- Create NOTIFY channel `rbac_changed`.
- For each of `roles`, `actions`, `permissions`, `abac_fences`: trigger on INSERT/UPDATE/DELETE to `pg_notify('rbac_changed', TG_TABLE_NAME)`.

---

## Entities (TypeORM)
- `Node.entity.ts`: `id`, `type`, `slug`, `name`, `parent` (optional), `path` (string), `attrs: Record<string,any>`.
- `Role.entity.ts`: `id`, `name`, `level`.
- `Action.entity.ts`: `name`.
- `Permission.entity.ts`: `id`, `domain`, `resourceType`, `action` (FK), `minRole` (FK).
- `RoleAssignment.entity.ts`: `id`, `userId`, `node` (FK), `role` (FK), `constraints: Record<string,any>`.
- `AbacFence.entity.ts`: `id`, `action` (FK), `expr: Record<string,any>`.

> Store `path` as string and use raw SQL for `ltree` operators.

---

## Core Authorization

### SQL (parameterized; put in `/src/db/rbac.sql.ts`)
Inputs: `$1=resourceNodeId`, `$2=userId`, `$3=domain`, `$4=resourceType`, `$5=actionName`
```sql
WITH target AS (SELECT path FROM nodes WHERE id = $1),
user_roles AS (
  SELECT MAX(r.level) AS max_level
  FROM role_assignments ra
  JOIN roles r ON r.id = ra.role_id
  JOIN nodes n ON n.id = ra.node_id
  JOIN target t ON n.path @> t.path        -- ancestor-or-equal
  WHERE ra.user_id = $2
)
SELECT ur.max_level AS user_level,
       req.level    AS required_level,
       (ur.max_level >= req.level) AS rbac_pass
FROM permissions p
JOIN roles req ON req.id = p.min_role_id
JOIN user_roles ur ON true
WHERE p.domain = $3
  AND p.resource_type = $4
  AND p.action_name = $5;
```

### Service (`/src/authz/authz.service.ts`)
- `isAllowed(userId, resourceNodeId, domain, resourceType, actionName, reqAttrs?)`
  - Run the SQL above.
  - If `rbac_pass` is true, fetch ABAC fence for `actionName` and evaluate JSONLogic over context `{ user, memberships?, reqAttrs }`.
  - **Bootstrap bypass**: if `RBAC_BOOTSTRAP_MODE=true` and `userId ∈ RBAC_BOOTSTRAP_USER_IDS`, return `true`.

### Guard & Decorator
- `@Authz({ action: 'manage_roster', domain: 'node', resourceType: 'team', resourceParam: 'teamId' })`
- Guard extracts `resourceNodeId` from route (by param or service), calls `AuthzService.isAllowed`, throws `ForbiddenException` on deny.

### Cache & Invalidation
- `/src/authz/permissions.cache.ts`: cache roles/permissions/abac with short TTL.
- `/src/db/notify.ts`: subscribe `LISTEN rbac_changed` and invalidate cache on events.

### ABAC
- `/src/authz/abac.ts`: evaluate JSONLogic; default deny on invalid rule.

---

## API Endpoints

### Admin (guarded)
- **Roles**: CRUD (`name`, `level`)
- **Actions**: CRUD (`name`)
- **Permissions**: CRUD (`domain`, `resourceType`, `actionName`, `minRoleId`)
- **ABAC fences**: CRUD (`actionName`, `expr`)
- **Role assignments**: CRUD (`userId`, `nodeId`, `roleId`, `constraints`)

### Nodes
- CRUD; when creating, compute `path = parent.path || slug`, else `parent.path || ''` + `.` + normalized `slug`.
- Enforce legal transitions (org→client→company→department→team→group).

### Authz Check
- `POST /authz/check` → body: `{ userId, resourceNodeId, domain, resourceType, actionName, reqAttrs? }`
- Return `{ allowed, userLevel, requiredLevel, abac: { evaluated, result? } }`

---

## Tests (`/test/authz.spec.ts`)
Create a minimal ladder:
- org → state (client) → district (company) → school (department) → class (team) → group

Scenarios:
1. **Ancestor pass**: `CompanyAdmin` at district can `read_reports` at any school in district (required role ≤ level).
2. **Scope isolation**: `TeamOwner` at class A can `manage_roster` for class A only.
3. **ABAC fence**: add fence for `view_student_pii` requiring `{"==":[{"var":"user.pupilData"}, true]}`.
   - `DepartmentManager` without `pupilData:true` → deny; with it → allow.
4. **Notify invalidation**: modify a permission min role, trigger NOTIFY, assert cache invalidated and decision changes.

---

## README
Include:
- Purpose & diagram (text OK).
- Migrations/run:
  - `psql -c "CREATE EXTENSION IF NOT EXISTS ltree;"` (or via migration)
  - `npm run migration:run`
- Env:
  - `DATABASE_URL`
  - `RBAC_BOOTSTRAP_MODE`
  - `RBAC_BOOTSTRAP_USER_IDS`
- Quickstart: enable bootstrap → create roles/actions/permissions via `/admin` → disable bootstrap.

---

## Acceptance Criteria
1. **Dynamic only**: roles/actions/permissions/ABAC live in DB; no static YAML/constants.
2. **Hierarchy**: `ltree` path with ancestor checks; inheritance is downward.
3. **RBAC query**: single SQL computes `userLevel ≥ requiredLevel`.
4. **ABAC**: JSONLogic post-check for sensitive actions.
5. **Cache coherence**: `LISTEN/NOTIFY` invalidates cache on admin changes.
6. **Bootstrap**: env-gated bypass to initialize empty systems; then disabled.
7. **Tests**: cover ancestor, isolation, ABAC, cache invalidation.

---

## Non-Goals
- UI polish beyond admin CRUD.
- Gradebook/business logic changes.
- Cross-tenant sharing (future: explicit shares outside lineage).
