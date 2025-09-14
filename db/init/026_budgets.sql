create table if not exists budgets (
  org_id uuid primary key references organizations(id) on delete cascade,
  monthly_limit_usd numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);
