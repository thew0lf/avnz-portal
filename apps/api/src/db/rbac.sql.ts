export const RBAC_CHECK_SQL = `
WITH target AS (SELECT path FROM authz.nodes WHERE id = $1),
user_roles AS (
  SELECT MAX(r.level) AS max_level
  FROM authz.role_assignments ra
  JOIN authz.roles r ON r.id = ra.role_id
  JOIN authz.nodes n ON n.id = ra.node_id
  JOIN target t ON n.path @> t.path        -- ancestor-or-equal
  WHERE ra.user_id = $2
)
SELECT ur.max_level AS user_level,
       req.level    AS required_level,
       (ur.max_level >= req.level) AS rbac_pass
FROM authz.permissions p
JOIN authz.roles req ON req.id = p.min_role_id
JOIN user_roles ur ON true
WHERE p.domain = $3
  AND p.resource_type = $4
  AND p.action_name = $5`;