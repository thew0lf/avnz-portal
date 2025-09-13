DO $$ BEGIN
  INSERT INTO authz.route_registry(id,method,path,domain,resource_type,action_name,resource_param)
  VALUES
    (gen_random_uuid(),'POST','/nodes','node','client','create','parent_id'),
    (gen_random_uuid(),'PATCH','/nodes/:id','node','client','update','id'),
    (gen_random_uuid(),'DELETE','/nodes/:id','node','client','delete','id'),
    -- Admin endpoints: secured by org configure
    (gen_random_uuid(),'GET','/admin/roles','node','org','configure','nodeId'),
    (gen_random_uuid(),'POST','/admin/roles','node','org','configure','nodeId'),
    (gen_random_uuid(),'PATCH','/admin/roles/:id','node','org','configure','nodeId'),
    (gen_random_uuid(),'DELETE','/admin/roles/:id','node','org','configure','nodeId'),
    (gen_random_uuid(),'GET','/admin/actions','node','org','configure','nodeId'),
    (gen_random_uuid(),'POST','/admin/actions','node','org','configure','nodeId'),
    (gen_random_uuid(),'DELETE','/admin/actions/:name','node','org','configure','nodeId'),
    (gen_random_uuid(),'GET','/admin/permissions','node','org','configure','nodeId'),
    (gen_random_uuid(),'POST','/admin/permissions','node','org','configure','nodeId'),
    (gen_random_uuid(),'PATCH','/admin/permissions/:id','node','org','configure','nodeId'),
    (gen_random_uuid(),'DELETE','/admin/permissions/:id','node','org','configure','nodeId'),
    (gen_random_uuid(),'GET','/admin/assignments','node','org','configure','nodeId'),
    (gen_random_uuid(),'POST','/admin/assignments','node','org','configure','nodeId'),
    (gen_random_uuid(),'DELETE','/admin/assignments/:id','node','org','configure','nodeId'),
    (gen_random_uuid(),'GET','/admin/abac','node','org','configure','nodeId'),
    (gen_random_uuid(),'POST','/admin/abac','node','org','configure','nodeId'),
    (gen_random_uuid(),'PATCH','/admin/abac/:id','node','org','configure','nodeId'),
    (gen_random_uuid(),'DELETE','/admin/abac/:id','node','org','configure','nodeId'),
    (gen_random_uuid(),'GET','/admin/security-settings','node','org','configure','nodeId'),
    (gen_random_uuid(),'PATCH','/admin/security-settings','node','org','configure','nodeId'),
    (gen_random_uuid(),'GET','/admin/routes','node','org','configure','nodeId'),
    (gen_random_uuid(),'POST','/admin/routes','node','org','configure','nodeId'),
    (gen_random_uuid(),'DELETE','/admin/routes/:id','node','org','configure','nodeId')
  ON CONFLICT (method,path) DO NOTHING;
END $$;
