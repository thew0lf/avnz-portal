-- 040_jira_jobs.sql — Track Jira issue ↔ portal job linkage to avoid duplicates

create table if not exists jira_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  issue_key text not null,
  job_id text not null,
  status text not null default 'queued',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create unique index if not exists uniq_jira_jobs_org_issue on jira_jobs(org_id, issue_key) where deleted_at is null;

