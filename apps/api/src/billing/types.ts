export type UUID = string;

// Core tables mapped from external CRM billing documents

export interface BillingProduct {
  id: UUID;
  org_id: UUID;
  client_id?: UUID | null;
  code?: UUID | null; // external UUID code
  sku?: string | null;
  name: string;
  state?: string | null; // active | in-active | out-of-stock
  description?: string | null;
  descriptor?: string | null;
  url_key?: string | null;
  cost?: number | null;
  weight?: number | null;
  is_taxable?: boolean | null;
  is_discount?: boolean | null;
  is_redeemable?: boolean | null;
  attributes?: Record<string, unknown> | null;
  cms?: Record<string, unknown> | null;
  media?: Record<string, unknown> | null;
  cross_product_id?: UUID | null;
  cross_banner?: string | null;
  created_at: string; // ISO
  modified_at?: string | null;
  deleted_at?: string | null;
}

export interface BillingCustomer {
  id: UUID;
  org_id: UUID;
  client_id?: UUID | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  created_at: string;
  modified_at?: string | null;
  deleted_at?: string | null;
}

export interface BillingAddress {
  id: UUID;
  org_id: UUID;
  customer_id?: UUID | null;
  order_id?: UUID | null;
  kind: 'billing' | 'shipping';
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface BillingOrder {
  id: UUID;
  org_id: UUID;
  client_id?: UUID | null;
  customer_id?: UUID | null;
  order_number?: string | null;
  token?: string | null;
  currency: string;
  locale_type?: string | null;
  amount?: number | null;
  base_amount?: number | null;
  tax_amount?: number | null;
  shipping_amount?: number | null;
  discount_amount?: number | null;
  total_amount?: number | null;
  quantity?: number | null;
  discount_code?: string | null;
  state?: string | null;
  type?: string | null;
  conversion_tracking_id?: string | null;
  affiliate_tour_id?: string | null;
  refund_amount?: number | null;
  refund_request?: number | null;
  tax_refund_amount?: number | null;
  quantity_refunded?: number | null;
  affiliate_payout?: number | null;
  shipped?: number | null;
  returned?: number | null;
  sales_check?: number | null;
  charged_back?: number | null;
  can_ship_partial?: boolean | null;
  email_sent?: boolean | null;
  weight?: number | null;
  email?: string | null;
  redemption_code?: string | null;
  redeemed?: number | null;
  shipping_refund_request?: number | null;
  shipping_refund?: number | null;
  risk_score?: number | null;
  risk_source?: string | null;
  site_theme?: string | null;
  descriptor?: string | null;
  external_fulfillment_id?: string | null;
  purchase_type?: string | null;
  split_count?: number | null;
  representment?: number | null;
  subscription_id?: string | null;
  display_type?: string | null;
  timeout_seconds?: number | null;
  is_continuity?: boolean | null;
  shipment_type?: string | null;
  shipping_priority?: number | null;
  external_order_number?: string | null;
  payment_page_id?: string | null;
  installment_payments?: number | null;
  billing_address_id?: UUID | null;
  shipping_address_id?: UUID | null;
  tracking_email_sent?: boolean | null;
  redemption_date?: string | null;
  email_sent_date?: string | null;
  tracking_email_sent_date?: string | null;
  last_refund_date?: string | null;
  modified_at?: string | null;
  created_at: string;
  rma_date?: string | null;
  blacklist_date?: string | null;
  transaction_date?: string | null;
  fulfillment_date?: string | null;
  transit_date?: string | null;
  delivery_date?: string | null;
  geo?: Record<string, unknown> | null;
  source?: Record<string, unknown> | null;
  origin?: Record<string, unknown> | null;
  promotions?: Record<string, unknown> | null;
  fulfillment_state?: string | null;
  extra?: Record<string, unknown> | null;
  deleted_at?: string | null;
}

export interface BillingOrderItem {
  id: UUID;
  org_id: UUID;
  order_id: UUID;
  product_id?: UUID | null;
  name?: string | null;
  description?: string | null;
  sku?: string | null;
  qty_ordered: number;
  qty_refunded: number;
  qty_pending_refund: number;
  amount?: number | null;
  refund_amount?: number | null;
  weight?: number | null;
  price?: number | null;
  warehouse_id?: string | null;
  do_not_ship?: boolean | null;
  meta?: Record<string, unknown> | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface BillingTransaction {
  id: UUID;
  org_id: UUID;
  order_id?: UUID | null;
  state?: string | null;
  amount?: number | null;
  currency?: string | null;
  processor?: string | null;
  response_code?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface BillingTrackingNumber {
  id: UUID;
  org_id: UUID;
  order_id: UUID;
  kind?: string | null;
  code: string;
  created_at: string;
  deleted_at?: string | null;
}

