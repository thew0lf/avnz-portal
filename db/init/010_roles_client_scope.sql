-- Scope roles to optional client level while preserving org-level roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Drop old unique constraint if present (org_id, name)
DO $$ BEGIN
  ALTER TABLE roles DROP CONSTRAINT roles_org_id_name_key;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Enforce uniqueness:
-- 1) Org-level roles (client_id is null): unique per (org_id, name)
CREATE UNIQUE INDEX IF NOT EXISTS roles_org_name_null_client_unique
  ON roles(org_id, name)
  WHERE client_id IS NULL;

-- 2) Client-level roles: unique per (org_id, client_id, name)
CREATE UNIQUE INDEX IF NOT EXISTS roles_org_client_name_unique
  ON roles(org_id, client_id, name)
  WHERE client_id IS NOT NULL;

