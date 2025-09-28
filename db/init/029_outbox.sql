-- Outbox table for queued messages (email)

CREATE TABLE IF NOT EXISTS outbox_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- e.g., 'email.password_reset', 'email.invite'
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  template_key TEXT, -- e.g., 'password_reset'
  vars JSONB NOT NULL DEFAULT '{}'::jsonb, -- template variables (e.g., { token, url })
  idempotency_key TEXT UNIQUE, -- dedupe key
  status TEXT NOT NULL DEFAULT 'pending', -- pending|processing|sent|failed
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error TEXT,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_emails_pending ON outbox_emails(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_outbox_emails_org ON outbox_emails(org_id);

-- Updated_at trigger
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER AS $fn$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql;
EXCEPTION WHEN duplicate_function THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_outbox_emails_updated_at
  BEFORE UPDATE ON outbox_emails
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
