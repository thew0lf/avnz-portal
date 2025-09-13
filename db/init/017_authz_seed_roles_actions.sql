-- Seed commonly used role names and sample actions (idempotent)
DO $$ BEGIN
  PERFORM 1 FROM authz.roles WHERE name='OrgOwner';
  IF NOT FOUND THEN
    INSERT INTO authz.roles(id,name,level) VALUES
      (gen_random_uuid(),'OrgOwner',100),
      (gen_random_uuid(),'OrgAdmin',90),
      (gen_random_uuid(),'OrgAccountManager',80),
      (gen_random_uuid(),'OrgStaff',70),
      (gen_random_uuid(),'OrgEmployee',60),
      (gen_random_uuid(),'ClientOwner',55),
      (gen_random_uuid(),'ClientAdmin',50),
      (gen_random_uuid(),'ClientAuditor',45),
      (gen_random_uuid(),'ClientStaff',40),
      (gen_random_uuid(),'ClientEmployee',35),
      (gen_random_uuid(),'CompanyAdmin',30),
      (gen_random_uuid(),'CompanyManager',25),
      (gen_random_uuid(),'CompanyAuditor',20),
      (gen_random_uuid(),'DepartmentAdmin',18),
      (gen_random_uuid(),'DepartmentManager',16),
      (gen_random_uuid(),'DepartmentAuditor',14),
      (gen_random_uuid(),'TeamOwner',12),
      (gen_random_uuid(),'TeamManager',10),
      (gen_random_uuid(),'TeamContributor',8),
      (gen_random_uuid(),'TeamViewer',6),
      (gen_random_uuid(),'GroupLeader',4),
      (gen_random_uuid(),'GroupContributor',3),
      (gen_random_uuid(),'GroupViewer',2);
  END IF;
END $$;

INSERT INTO authz.actions(name) VALUES
  ('read'),('create'),('update'),('delete'),('invite'),('approve'),('configure')
ON CONFLICT DO NOTHING;

