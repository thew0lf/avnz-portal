CREATE TABLE IF NOT EXISTS authz.route_registry (
  id uuid PRIMARY KEY,
  method text NOT NULL,
  path text NOT NULL,
  domain text NOT NULL,
  resource_type text NOT NULL,
  action_name text NOT NULL,
  resource_param text,
  UNIQUE (method, path)
);

