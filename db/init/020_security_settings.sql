CREATE TABLE IF NOT EXISTS security_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  require_mfa BOOLEAN NOT NULL DEFAULT TRUE,
  password_policy JSONB NOT NULL DEFAULT '{"minLength":12,"requireUpper":true,"requireLower":true,"requireDigit":true,"requireSymbol":true}'::jsonb,
  audit_retention_days INT NOT NULL DEFAULT 365,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO security_settings(id) VALUES (1) ON CONFLICT (id) DO NOTHING;

