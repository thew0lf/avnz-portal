-- Billing core schema translated from external CRM (Mongo ODM) to Postgres
-- Idempotent DDL. Adds core tables to support Orders, Products, Customers,
-- Order Items, Transactions, Shipment Tracking, and simple Affiliates/Promotions.

-- Ensure pgcrypto for gen_random_uuid (used elsewhere in repo as well)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Products
CREATE TABLE IF NOT EXISTS billing_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  code UUID, -- external product code (UUID in source)
  sku TEXT,
  name TEXT NOT NULL,
  state TEXT, -- active | in-active | out-of-stock
  description TEXT,
  descriptor TEXT,
  url_key TEXT,
  cost NUMERIC(14,4),
  weight NUMERIC(14,4),
  is_taxable BOOLEAN,
  is_discount BOOLEAN,
  is_redeemable BOOLEAN,
  attributes JSONB, -- arbitrary name/value pairs
  cms JSONB,        -- content blocks
  media JSONB,      -- images, etc.
  cross_product_id UUID REFERENCES billing_products(id) ON DELETE SET NULL,
  cross_banner TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  modified_at timestamptz,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_billing_products_org ON billing_products(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_products_client ON billing_products(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_products_sku ON billing_products(sku);
CREATE INDEX IF NOT EXISTS idx_billing_products_state ON billing_products(state);
CREATE INDEX IF NOT EXISTS idx_billing_products_deleted ON billing_products(deleted_at);

-- Customers (subset: identity; addresses separate)
CREATE TABLE IF NOT EXISTS billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  modified_at timestamptz,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_billing_customers_org ON billing_customers(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_customers_client ON billing_customers(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_customers_email ON billing_customers(lower(email));
CREATE INDEX IF NOT EXISTS idx_billing_customers_deleted ON billing_customers(deleted_at);

-- Addresses (billing/shipping)
CREATE TABLE IF NOT EXISTS billing_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES billing_customers(id) ON DELETE SET NULL,
  order_id UUID, -- denormalized for quick lookups (optional)
  kind TEXT CHECK (kind IN ('billing','shipping')),
  name TEXT,
  line1 TEXT,
  line2 TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  country TEXT,
  phone TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_billing_addresses_org ON billing_addresses(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_addresses_customer ON billing_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_addresses_order ON billing_addresses(order_id);
CREATE INDEX IF NOT EXISTS idx_billing_addresses_deleted ON billing_addresses(deleted_at);

-- Orders
CREATE TABLE IF NOT EXISTS billing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES billing_customers(id) ON DELETE SET NULL,
  order_number TEXT,
  token TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  locale_type TEXT,
  amount NUMERIC(14,4),
  base_amount NUMERIC(14,4),
  tax_amount NUMERIC(14,4),
  shipping_amount NUMERIC(14,4),
  discount_amount NUMERIC(14,4),
  total_amount NUMERIC(14,4),
  quantity NUMERIC(14,4),
  discount_code TEXT,
  state TEXT,
  type TEXT,
  conversion_tracking_id TEXT,
  affiliate_tour_id TEXT,
  refund_amount NUMERIC(14,4),
  refund_request NUMERIC(14,4),
  tax_refund_amount NUMERIC(14,4),
  quantity_refunded NUMERIC(14,4),
  affiliate_payout NUMERIC(14,4),
  shipped INT,
  returned INT,
  sales_check INT,
  charged_back INT,
  can_ship_partial BOOLEAN,
  email_sent BOOLEAN,
  weight NUMERIC(14,4),
  email TEXT,
  redemption_code TEXT,
  redeemed INT,
  shipping_refund_request INT,
  shipping_refund NUMERIC(14,4),
  risk_score NUMERIC(10,4),
  risk_source TEXT,
  site_theme TEXT,
  descriptor TEXT,
  external_fulfillment_id TEXT,
  purchase_type TEXT,
  split_count INT,
  representment INT,
  subscription_id TEXT,
  display_type TEXT,
  timeout_seconds INT,
  is_continuity BOOLEAN,
  shipment_type TEXT,
  shipping_priority INT,
  external_order_number TEXT,
  payment_page_id TEXT,
  installment_payments INT,
  -- denormalized keys to addresses
  billing_address_id UUID REFERENCES billing_addresses(id) ON DELETE SET NULL,
  shipping_address_id UUID REFERENCES billing_addresses(id) ON DELETE SET NULL,
  -- timestamps
  tracking_email_sent BOOLEAN,
  redemption_date timestamptz,
  email_sent_date timestamptz,
  tracking_email_sent_date timestamptz,
  last_refund_date timestamptz,
  modified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  rma_date timestamptz,
  blacklist_date timestamptz,
  transaction_date timestamptz,
  fulfillment_date timestamptz,
  transit_date timestamptz,
  delivery_date timestamptz,
  -- flexible fields
  geo JSONB,
  source JSONB,
  origin JSONB,
  promotions JSONB,
  fulfillment_state TEXT,
  extra JSONB,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_billing_orders_org ON billing_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_client ON billing_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_customer ON billing_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_number ON billing_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_billing_orders_state ON billing_orders(state);
CREATE INDEX IF NOT EXISTS idx_billing_orders_email_sent ON billing_orders(email_sent);
CREATE INDEX IF NOT EXISTS idx_billing_orders_shipped ON billing_orders(shipped);
CREATE INDEX IF NOT EXISTS idx_billing_orders_created ON billing_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_orders_deleted ON billing_orders(deleted_at);

-- Order items
CREATE TABLE IF NOT EXISTS billing_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES billing_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES billing_products(id) ON DELETE SET NULL,
  name TEXT,
  description TEXT,
  sku TEXT,
  qty_ordered NUMERIC(14,4) NOT NULL DEFAULT 0,
  qty_refunded NUMERIC(14,4) NOT NULL DEFAULT 0,
  qty_pending_refund NUMERIC(14,4) NOT NULL DEFAULT 0,
  amount NUMERIC(14,4),
  refund_amount NUMERIC(14,4),
  weight NUMERIC(14,4),
  price NUMERIC(14,4),
  warehouse_id TEXT,
  do_not_ship BOOLEAN,
  meta JSONB,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_billing_order_items_order ON billing_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_billing_order_items_product ON billing_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_billing_order_items_deleted ON billing_order_items(deleted_at);

-- Transactions
CREATE TABLE IF NOT EXISTS billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id UUID REFERENCES billing_orders(id) ON DELETE SET NULL,
  state TEXT,
  amount NUMERIC(14,4),
  currency TEXT DEFAULT 'USD',
  processor TEXT,
  response_code TEXT,
  details JSONB,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_org ON billing_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_order ON billing_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_deleted ON billing_transactions(deleted_at);

-- Shipment tracking numbers
CREATE TABLE IF NOT EXISTS billing_tracking_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES billing_orders(id) ON DELETE CASCADE,
  kind TEXT, -- carrier/type (e.g., fedex, ups)
  code TEXT NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_billing_tracking_order ON billing_tracking_numbers(order_id);
CREATE INDEX IF NOT EXISTS idx_billing_tracking_code ON billing_tracking_numbers(code);
CREATE INDEX IF NOT EXISTS idx_billing_tracking_deleted ON billing_tracking_numbers(deleted_at);

-- Affiliates (minimal)
CREATE TABLE IF NOT EXISTS billing_affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT,
  code TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Promotions (minimal). Orders store applied promotions in promotions JSONB; this
-- table can hold definitions if needed.
CREATE TABLE IF NOT EXISTS billing_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  code TEXT UNIQUE,
  name TEXT,
  meta JSONB,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

