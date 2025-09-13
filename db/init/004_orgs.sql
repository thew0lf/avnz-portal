-- Organizations (Clients) with unique short code
CREATE TABLE IF NOT EXISTS organizations (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Adjust users: add username, change email uniqueness to be per org (code)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
-- Drop global email unique if present
DO $$ BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Ensure composite uniques
DO $$ BEGIN
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS users_org_email_key ON users(org_id, email)';
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS users_org_username_key ON users(org_id, username)';
END $$;

-- Seed default demo organization to match sample data
INSERT INTO organizations(code, name) VALUES ('demo','Demo Org') ON CONFLICT (code) DO NOTHING;

