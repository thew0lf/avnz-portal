-- Evolve auth model to Organizations -> Clients -> Projects, Users, Memberships, Project Members

-- 1) Organizations: convert from code PK to UUID PK + unique(code)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
-- Drop old primary key on code if present, make id the primary key
DO $$ BEGIN
  ALTER TABLE organizations DROP CONSTRAINT organizations_pkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
ALTER TABLE organizations ALTER COLUMN id SET NOT NULL;
ALTER TABLE organizations ADD PRIMARY KEY (id);
CREATE UNIQUE INDEX IF NOT EXISTS organizations_code_key ON organizations(code);

-- 2) Clients under org
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill clients from existing organizations (1:1 for now)
INSERT INTO clients (org_id, code, name)
SELECT o.id, o.code, o.name FROM organizations o
ON CONFLICT (code) DO NOTHING;

-- 3) Projects (child of org, optional client)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Users (already exist). Ensure username index (global or per-org via membership).
CREATE INDEX IF NOT EXISTS idx_users_email ON users(lower(email));
CREATE INDEX IF NOT EXISTS idx_users_username ON users(lower(username));

-- 5) Memberships (user ↔ org with role)
CREATE TABLE IF NOT EXISTS memberships (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, org_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(org_id);

-- 6) Project members (optional per-project roles)
CREATE TABLE IF NOT EXISTS project_members (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);

-- 7) Domain tables: add optional project_id (org remains as-is for now)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS project_id UUID;

