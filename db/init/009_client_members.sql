-- Client-level membership to isolate access within an org
CREATE TABLE IF NOT EXISTS client_members (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'client',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_client_members_client ON client_members(client_id);

