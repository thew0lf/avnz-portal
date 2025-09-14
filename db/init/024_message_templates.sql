-- Email and SMS templates with client-level overrides
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  client_id uuid references clients(id) on delete cascade,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_email_templates_key on email_templates(key);
create index if not exists idx_email_templates_client on email_templates(client_id);

create table if not exists sms_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  client_id uuid references clients(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_sms_templates_key on sms_templates(key);
create index if not exists idx_sms_templates_client on sms_templates(client_id);

-- Seed defaults for invitations if not present
insert into email_templates(key, client_id, subject, body)
select 'invite', null,
  'You''re invited to join {{clientName}}{{orgNameSuffix}}',
  E'You''ve been invited to join {{clientName}}{{orgNameSuffix}}.\nUse the link below to accept the invite and set your password:\n\n{{url}}\n\nIf you did not expect this invite, you can ignore this email.'
where not exists (select 1 from email_templates where key='invite' and client_id is null);

insert into sms_templates(key, client_id, body)
select 'invite', null,
  'You''re invited to join {{clientName}}. Accept: {{url}}'
where not exists (select 1 from sms_templates where key='invite' and client_id is null);
