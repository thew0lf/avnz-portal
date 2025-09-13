-- RBAC change notifications for cache invalidation
CREATE OR REPLACE FUNCTION authz.notify_rbac_changed() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('rbac_changed', TG_TABLE_NAME);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_roles_changed
  AFTER INSERT OR UPDATE OR DELETE ON authz.roles
  FOR EACH STATEMENT EXECUTE FUNCTION authz.notify_rbac_changed();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_actions_changed
  AFTER INSERT OR UPDATE OR DELETE ON authz.actions
  FOR EACH STATEMENT EXECUTE FUNCTION authz.notify_rbac_changed();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_permissions_changed
  AFTER INSERT OR UPDATE OR DELETE ON authz.permissions
  FOR EACH STATEMENT EXECUTE FUNCTION authz.notify_rbac_changed();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_abac_fences_changed
  AFTER INSERT OR UPDATE OR DELETE ON authz.abac_fences
  FOR EACH STATEMENT EXECUTE FUNCTION authz.notify_rbac_changed();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

