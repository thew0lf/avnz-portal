-- Enable RLS on key multi-tenant tables with org_id UUID columns
DO $$ BEGIN
  ALTER TABLE documents ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE projects ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE clients ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Create permissive policies that restrict when app.org_uuid is set; allow all if not set (compat)
CREATE OR REPLACE FUNCTION org_match(uuid, text) RETURNS boolean AS $$
  SELECT CASE WHEN $2 IS NULL OR $2 = '' THEN true ELSE $1 = ($2)::uuid END;
$$ LANGUAGE SQL IMMUTABLE;

DO $$ BEGIN
  CREATE POLICY rls_docs ON documents USING (org_match(org_id, current_setting('app.org_uuid', true)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY rls_chunks ON document_chunks USING (org_match(org_id, current_setting('app.org_uuid', true)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY rls_usage ON usage_events USING (org_match(org_id, current_setting('app.org_uuid', true)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY rls_pricing ON pricing_rules USING (org_match(org_id, current_setting('app.org_uuid', true)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY rls_projects ON projects USING (org_match(org_id, current_setting('app.org_uuid', true)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY rls_clients ON clients USING (org_match(org_id, current_setting('app.org_uuid', true)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

