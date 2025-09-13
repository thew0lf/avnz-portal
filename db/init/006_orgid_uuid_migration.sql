-- Migrate org_id from TEXT (client code) to UUID referencing organizations(id)
-- Helper: Adds new column org_id_uuid, backfills from organizations.code, renames.

-- Pricing rules
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS org_id_uuid UUID;
UPDATE pricing_rules pr SET org_id_uuid = o.id FROM organizations o WHERE pr.org_id IS NOT NULL AND o.code = pr.org_id;
ALTER TABLE pricing_rules ALTER COLUMN org_id_uuid DROP NOT NULL;
ALTER TABLE pricing_rules DROP COLUMN IF EXISTS org_id;
ALTER TABLE pricing_rules RENAME COLUMN org_id_uuid TO org_id;
ALTER TABLE pricing_rules ADD CONSTRAINT fk_pricing_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Usage events
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS org_id_uuid UUID;
UPDATE usage_events ue SET org_id_uuid = o.id FROM organizations o WHERE ue.org_id IS NOT NULL AND o.code = ue.org_id;
ALTER TABLE usage_events ALTER COLUMN org_id_uuid DROP NOT NULL;
ALTER TABLE usage_events DROP COLUMN IF EXISTS org_id;
ALTER TABLE usage_events RENAME COLUMN org_id_uuid TO org_id;
ALTER TABLE usage_events ADD CONSTRAINT fk_usage_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS org_id_uuid UUID;
UPDATE documents d SET org_id_uuid = o.id FROM organizations o WHERE d.org_id IS NOT NULL AND o.code = d.org_id;
ALTER TABLE documents ALTER COLUMN org_id_uuid DROP NOT NULL;
ALTER TABLE documents DROP COLUMN IF EXISTS org_id;
ALTER TABLE documents RENAME COLUMN org_id_uuid TO org_id;
ALTER TABLE documents ADD CONSTRAINT fk_docs_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Document chunks
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS org_id_uuid UUID;
UPDATE document_chunks dc SET org_id_uuid = o.id FROM organizations o WHERE dc.org_id IS NOT NULL AND o.code = dc.org_id;
ALTER TABLE document_chunks ALTER COLUMN org_id_uuid DROP NOT NULL;
ALTER TABLE document_chunks DROP COLUMN IF EXISTS org_id;
ALTER TABLE document_chunks RENAME COLUMN org_id_uuid TO org_id;
ALTER TABLE document_chunks ADD CONSTRAINT fk_chunks_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Audit log
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS org_id_uuid UUID;
UPDATE audit_log a SET org_id_uuid = o.id FROM organizations o WHERE a.org_id IS NOT NULL AND o.code = a.org_id;
ALTER TABLE audit_log ALTER COLUMN org_id_uuid DROP NOT NULL;
ALTER TABLE audit_log DROP COLUMN IF EXISTS org_id;
ALTER TABLE audit_log RENAME COLUMN org_id_uuid TO org_id;
-- Not enforcing FK on audit log to avoid failures on historical rows, but could be added similarly.

