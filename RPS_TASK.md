# 🚀 Jira Task: RPS FastAPI CSV & Web Proxies Migration

## 🎯 Project
Avnz App (`AVNZ`)

## 📝 Summary
Implement **RPS FastAPI CSV export + web API proxies + Admin UI pages** with testing and validation.  
Prepare scaffolding for future **Payment Processor migration**.

---

## 🔨 Scope of Work

### RPS FastAPI CSV
- Add `?format=csv` for Orders, Customers, Transactions in:
  - `apps/ai/app/rps/router.py`

### Web API Proxies
- JWT with refresh; fallback to Authorization header.
- Update/create:
  - `app/api/rps/orders/route.ts`
  - `app/api/rps/orders/[id]/route.ts`
  - `app/api/rps/customers/route.ts`
  - `app/api/rps/transactions/route.ts`

### Admin UI (RPS)
- Add new menu section **“RPS (FastAPI)”**: Overview, Orders, Customers, Transactions.
- Create pages:
  - `app/admin/dashboard/rps/page.tsx`
  - `app/admin/dashboard/rps/orders/page.tsx`
  - `app/admin/dashboard/rps/orders/RpsOrdersTable.tsx`
  - `app/admin/dashboard/rps/orders/[id]/page.tsx`
  - `app/admin/dashboard/rps/customers/page.tsx`
  - `app/admin/dashboard/rps/transactions/page.tsx`

### Test Script
- `scripts/rps/smoke.sh`:
  - Verify 401 without auth to `ai:/rps/orders`
  - Generate signed JWT and verify CSV on `ai:/rps/orders?format=csv`
  - Probe `web:/api/rps/orders` with token (non-fatal in dev if session not established)

---

## ✅ Validations
- Health/smoke/walkthrough pass.
- AI health returns `200 provider=openai`.
- RPS pages compile; unauthenticated → redirect.
- Smoke confirms CSV export works + unauthenticated requests blocked.

---

## 📌 Notes: RPS → Payment Processor
Not yet migrated. Current work covers **read-only browsing (orders/customers/transactions) and CSV export**.

### Recommended Migration Plan
- **Domain Mapping:** enumerate supported gateways (Authorize.Net, Stripe, etc.), normalize operations (authorize, capture, refund, void, 3DS).  
- **DB Migrations:** `payment_methods`, `payment_intents`, `webhook_events (JSONB)`, idempotency keys.  
- **Services:** Adapters per processor with shared interface (`create_payment`, `capture`, `r_

