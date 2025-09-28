-- Soft delete support: add deleted_at to key tables
ALTER TABLE IF EXISTS email_templates    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE IF EXISTS sms_templates      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE IF EXISTS service_configs    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- AuthZ schema tables
ALTER TABLE IF EXISTS authz.route_registry   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE IF EXISTS authz.nodes            ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE IF EXISTS authz.roles            ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE IF EXISTS authz.actions          ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE IF EXISTS authz.permissions      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE IF EXISTS authz.role_assignments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE IF EXISTS authz.abac_fences      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_deleted   ON email_templates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_sms_templates_deleted     ON sms_templates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_service_configs_deleted   ON service_configs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_authz_routes_deleted      ON authz.route_registry(deleted_at);
CREATE INDEX IF NOT EXISTS idx_authz_nodes_deleted       ON authz.nodes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_authz_roles_deleted       ON authz.roles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_authz_actions_deleted     ON authz.actions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_authz_perms_deleted       ON authz.permissions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_authz_ra_deleted          ON authz.role_assignments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_authz_abac_deleted        ON authz.abac_fences(deleted_at);

