-- Route registry and permission for Billing read at org scope
DO $$ DECLARE org_staff uuid; BEGIN
  SELECT id INTO org_staff FROM authz.roles WHERE name='OrgStaff' LIMIT 1;
  IF org_staff IS NULL THEN RETURN; END IF;
  INSERT INTO authz.permissions(id,domain,resource_type,action_name,min_role_id)
  VALUES (gen_random_uuid(),'node','org','read',org_staff)
  ON CONFLICT (domain,resource_type,action_name) DO UPDATE SET min_role_id=excluded.min_role_id;
END $$;

-- Register org-scoped read routes for billing lists (resource resolved from auth org)
DO $$ BEGIN
  INSERT INTO authz.route_registry(id,method,path,domain,resource_type,action_name,resource_param)
  VALUES
    (gen_random_uuid(),'GET','/billing/orders','node','org','read','nodeId'),
    (gen_random_uuid(),'GET','/billing/customers','node','org','read','nodeId'),
    (gen_random_uuid(),'GET','/billing/transactions','node','org','read','nodeId')
  ON CONFLICT (method,path) DO NOTHING;
END $$;

