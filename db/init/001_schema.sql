
-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Audit
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  org_id TEXT,
  user_id TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  before JSONB,
  after JSONB,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Pricing
CREATE TABLE IF NOT EXISTS pricing_rules (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope in ('default','org','role','user')),
  org_id TEXT,
  role TEXT,
  user_id TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  metric TEXT NOT NULL CHECK (metric in ('embed_tokens','input_tokens','output_tokens')),
  price_per_1k NUMERIC(12,6) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Usage
CREATE TABLE IF NOT EXISTS usage_events (
  id BIGSERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  operation TEXT NOT NULL,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  embed_tokens INT DEFAULT 0,
  cost_usd NUMERIC(14,6) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Redaction
CREATE TABLE IF NOT EXISTS redaction_events (
  id BIGSERIAL PRIMARY KEY,
  node_type TEXT NOT NULL,
  node_id TEXT NOT NULL,
  document_id TEXT,
  pii_email INT DEFAULT 0,
  pii_phone INT DEFAULT 0,
  pii_ssn INT DEFAULT 0,
  pii_cc INT DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Docs + Vector Index
-- Using 1536 dims to match OpenAI text-embedding-3-small (adjustable via future migrations)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT,
  filename TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  plan TEXT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  content_redacted TEXT,
  embedding VECTOR(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_org ON document_chunks(org_id);
CREATE INDEX IF NOT EXISTS idx_chunks_vec ON document_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Cache embeddings for identical text
CREATE TABLE IF NOT EXISTS embeddings_cache (
  content_hash TEXT PRIMARY KEY,
  embedding VECTOR(1536),
  provider TEXT,
  model TEXT,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seeds
INSERT INTO pricing_rules(scope,provider,model,metric,price_per_1k,currency,active)
VALUES ('default','bedrock','anthropic.claude-3-haiku-20240307-v1:0','input_tokens',0.250,'USD',true)
ON CONFLICT DO NOTHING;

-- Enterprise role receives 20% discount vs default (example)
INSERT INTO pricing_rules(scope,role,provider,model,metric,price_per_1k,currency,active)
VALUES ('role','Enterprise','bedrock','anthropic.claude-3-haiku-20240307-v1:0','input_tokens',0.200,'USD',true)
ON CONFLICT DO NOTHING;
