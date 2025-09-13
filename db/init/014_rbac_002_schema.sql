-- RBAC schema (isolated to avoid conflicts with existing tables)
CREATE SCHEMA IF NOT EXISTS authz;

-- nodes (hierarchy)
CREATE TABLE IF NOT EXISTS authz.nodes (
  id        uuid PRIMARY KEY,
  type      text NOT NULL CHECK (type IN ('org','client','company','department','team','group')),
  slug      text NOT NULL,
  name      text NOT NULL,
  parent_id uuid REFERENCES authz.nodes(id) ON DELETE CASCADE,
  path      ltree NOT NULL,
  attrs     jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (parent_id, slug)
);
CREATE INDEX IF NOT EXISTS nodes_path_idx ON authz.nodes USING GIST (path);

-- roles (ordered by privilege)
CREATE TABLE IF NOT EXISTS authz.roles (
  id    uuid PRIMARY KEY,
  name  text UNIQUE NOT NULL,
  level int NOT NULL
);

-- actions
CREATE TABLE IF NOT EXISTS authz.actions (
  name text PRIMARY KEY
);

-- permissions (min role for action on resource type)
CREATE TABLE IF NOT EXISTS authz.permissions (
  id            uuid PRIMARY KEY,
  domain        text NOT NULL,
  resource_type text NOT NULL,
  action_name   text NOT NULL REFERENCES authz.actions(name),
  min_role_id   uuid NOT NULL REFERENCES authz.roles(id),
  UNIQUE (domain, resource_type, action_name)
);

-- role assignments (who has which role where)
CREATE TABLE IF NOT EXISTS authz.role_assignments (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL,
  node_id     uuid NOT NULL REFERENCES authz.nodes(id) ON DELETE CASCADE,
  role_id     uuid NOT NULL REFERENCES authz.roles(id),
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, node_id, role_id)
);
CREATE INDEX IF NOT EXISTS ra_user_idx ON authz.role_assignments(user_id);
CREATE INDEX IF NOT EXISTS ra_node_idx ON authz.role_assignments(node_id);

-- ABAC fences (optional)
CREATE TABLE IF NOT EXISTS authz.abac_fences (
  id          uuid PRIMARY KEY,
  action_name text NOT NULL REFERENCES authz.actions(name),
  expr        jsonb NOT NULL
);

