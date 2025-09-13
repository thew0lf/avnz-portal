-- Seed initial permissions mapping minimal for guard usage
DO $$ DECLARE org_admin uuid; BEGIN
  SELECT id INTO org_admin FROM authz.roles WHERE name='OrgAdmin' LIMIT 1;
  IF org_admin IS NULL THEN RETURN; END IF;
  -- Administer authz at org scope (configure)
  INSERT INTO authz.permissions(id,domain,resource_type,action_name,min_role_id)
  VALUES (gen_random_uuid(),'node','org','configure',org_admin)
  ON CONFLICT (domain,resource_type,action_name) DO UPDATE SET min_role_id=excluded.min_role_id;
END $$;

