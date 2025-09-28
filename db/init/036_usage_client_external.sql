-- Extend usage_events for richer attribution and correlation
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS details JSONB;

CREATE INDEX IF NOT EXISTS idx_usage_client ON usage_events(client_id);
CREATE INDEX IF NOT EXISTS idx_usage_external ON usage_events(external_id);

