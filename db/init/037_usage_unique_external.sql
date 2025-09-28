-- Ensure idempotent unique deduplication by (external_id, operation) when external_id is present
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_usage_external_op
  ON usage_events(external_id, operation)
  WHERE external_id IS NOT NULL;
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

