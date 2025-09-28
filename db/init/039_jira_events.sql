-- 039_jira_events.sql — Jira webhook event storage (org-scoped, soft-delete)

create table if not exists jira_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  client_id uuid null references clients(id) on delete set null,
  issue_key text null,
  issue_id text null,
  event_type text not null,
  actor jsonb null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_jira_events_org_created on jira_events(org_id, created_at desc);

