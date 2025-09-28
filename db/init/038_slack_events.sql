-- Slack events logging (org-scoped, soft-delete)
CREATE TABLE IF NOT EXISTS slack_events (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  team_id TEXT,
  channel_id TEXT,
  user_id TEXT,
  event_type TEXT,
  text TEXT,
  event_ts TEXT,
  payload JSONB NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_slack_events_org ON slack_events(org_id);
CREATE INDEX IF NOT EXISTS idx_slack_events_created ON slack_events(created_at);
CREATE INDEX IF NOT EXISTS idx_slack_events_deleted ON slack_events(deleted_at);

-- RBAC route registry entry for admin listing
INSERT INTO authz.route_registry(id, method, path, domain, resource_type, action_name, resource_param)
VALUES (gen_random_uuid(),'GET','/admin/slack/events','node','org','view','nodeId')
ON CONFLICT (method, path) DO UPDATE SET domain=excluded.domain, resource_type=excluded.resource_type, action_name=excluded.action_name, resource_param=excluded.resource_param;

