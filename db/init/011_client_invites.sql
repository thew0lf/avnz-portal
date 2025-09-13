-- Client invites for user registration without exposing client code
CREATE TABLE IF NOT EXISTS client_invites (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_invites_client ON client_invites(client_id);
CREATE INDEX IF NOT EXISTS idx_client_invites_email ON client_invites(lower(email));

