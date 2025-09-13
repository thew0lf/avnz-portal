-- Roles and permissions normalization
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Link memberships/project_members to roles
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- Backfill roles from existing membership.role values
DO $$
DECLARE r RECORD; rid UUID; BEGIN
  FOR r IN SELECT DISTINCT org_id, role FROM memberships WHERE role IS NOT NULL LOOP
    INSERT INTO roles(org_id, name) VALUES (r.org_id, r.role)
    ON CONFLICT (org_id, name) DO NOTHING;
    SELECT id INTO rid FROM roles WHERE org_id=r.org_id AND name=r.role;
    UPDATE memberships SET role_id=rid WHERE org_id=r.org_id AND role=r.role;
  END LOOP;
END $$;

-- Enforce FK on audit_log org_id now that it stores UUIDs
DO $$ BEGIN
  ALTER TABLE audit_log ADD CONSTRAINT fk_audit_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

