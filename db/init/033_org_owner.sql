-- Track organization owner and backfill portal-manager role
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_user_id UUID;

-- Backfill owner_user_id: choose the earliest membership with org role per organization
DO $$
DECLARE r RECORD; BEGIN
  FOR r IN
    SELECT m.org_id, m.user_id
    FROM memberships m
    JOIN (
      SELECT org_id, MIN(created_at) AS first_at FROM memberships WHERE role='org' GROUP BY org_id
    ) x ON x.org_id=m.org_id AND x.first_at=m.created_at
    WHERE m.role='org'
  LOOP
    UPDATE organizations SET owner_user_id = r.user_id WHERE id = r.org_id AND owner_user_id IS NULL;
  END LOOP;
END $$;

-- Ensure owners have portal-manager in users.roles
UPDATE users u
SET roles = ARRAY(SELECT DISTINCT UNNEST(u.roles || ARRAY['portal-manager']))
FROM organizations o
WHERE o.owner_user_id = u.id AND NOT ('portal-manager' = ANY(u.roles));

