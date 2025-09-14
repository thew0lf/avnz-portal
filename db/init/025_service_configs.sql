-- Encrypted service configs with org default and optional client overrides
create table if not exists service_configs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  service text not null,
  name text not null,
  value_enc jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, client_id, service, name)
);
create index if not exists idx_service_configs_org on service_configs(org_id);
create index if not exists idx_service_configs_client on service_configs(client_id);
create index if not exists idx_service_configs_service on service_configs(service);

