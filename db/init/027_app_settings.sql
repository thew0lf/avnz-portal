create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into app_settings(key, value)
values ('portal_name','Avnz')
on conflict (key) do nothing;

insert into app_settings(key, value)
values ('use_shadcn','true')
on conflict (key) do nothing;

