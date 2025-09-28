# RPS → FastAPI Migration (Master Task)

This document tracks the overall migration of external/crm-portal/vendor/RPS to a Python FastAPI package, including scope, assumptions, requirements, deliverables, phased plan, risks, and an evolving TODO checklist.

Status: OPEN (master task)
Owner: Platform / API team
Links:
- Portal Tasks dashboard: /admin/dashboard/tasks (queue sub‑tasks; use subject prefix "RPS→FastAPI")
- Usage attribution: org/client/project set via portal header filters

## Scope & Requirements

Approach (Phased)
- Discovery: inventory RPS modules, dependencies, I/O contracts, data stores, side effects.
- Domain model: map Mongo ODM docs → Pydantic/SQLAlchemy (or Motor) + schema/migrations and compatibility adapters.
- Services: re-implement business logic (orders, products, customers, transactions, promos, affiliates, tracking) as testable services.
- Routers: expose FastAPI endpoints with JWT/RBAC, idempotency, background jobs (email/SMS/webhooks).
- Integrations: replace Zend/Doctrine utilities (crypto, mail, queue, cache) with Python SDKs and Redis/SQS.
- Observability: structured logging, metrics, tracing; uniform errors and rate limiting.
- Migration: ETL/backfill plan, dual-read/dual-write (if required), shadow tests, staged cutover.
- Hardening: load tests, production toggles, rollback plan; docs and runbooks.

Inputs Needed
- Priority matrix (must‑have vs later) across modules/endpoints.
- Current data sources (Mongo/SQL), connection details, sample datasets.
- Third‑party integrations in use (payments, fulfillment, email/SMS), credentials in a safe channel.
- Auth/RBAC requirements and org/client scoping rules.
- Non-functional targets (latency, throughput, SLOs).

Deliverables
- Python package (routers + services + adapters) with pyproject, CI, and OpenAPI docs.
- Migrations (SQL or collection initializers) and ETL scripts.
- Test suite (unit + integration) and seed fixtures.
- Deployment manifests (Dockerfile, compose/k8s) and ops docs.

Timeline (Indicative)
- Week 1: Discovery, architecture, schema draft, skeleton package, CI.
- Weeks 2–3: Orders/Customers/Transactions: services + routers + tests; initial ETL.
- Weeks 4–5: Remaining modules (products, promos, affiliates, tracking), integrations, background workers.
- Week 6: Full migration tests, performance tuning, docs, staged cutover.

Risks/Assumptions
- Data model impedance (Mongo embeds → relational) may require JSON columns or interim adapters.
- Hidden coupling in vendor utilities; prioritize contract tests and feature flags.
- Payment/fulfillment integrations may need sandbox accounts for test parity.

## Execution Plan (Sub‑Tasks)

Queue each item in the Portal Tasks dashboard with subject prefix "RPS→FastAPI" and include acceptance criteria.

1) Discovery & ADR
- Inventory all RPS modules/classes
- Identify data flows, side effects, and integrations
- Draft ADR: target architecture, data model approach, service boundaries, authz

2) Domain Modeling
- ODM → SQLAlchemy/Pydantic mapping document
- Initial schema migrations (idempotent)
- Compatibility layer decisions (dual‑read adapters if needed)

3) Core Services + Routers (Phase 1)
- Orders, Customers, Transactions (read/list/detail)
- JWT/RBAC guards; OpenAPI docs
- Unit/integration tests

4) Integrations
- Crypto, mail (SendGrid), SMS (Twilio), queue/cache (Redis/SQS)
- Background tasks and idempotency

5) ETL & Cutover Plan
- Backfill scripts; shadow tests; validation reports
- Flagging and rollback steps

6) Hardening & Ops
- Load testing; SLOs; tracing/metrics/dashboards
- Runbooks and deployment manifests

## Tracking & Artifacts

Use this doc to track:
- Decisions: add ADR links here
- Open questions: record owner + due date
- Completed artifacts: schemas, scripts, manifests, dashboards

Open Questions
- [ ] Confirm provider pricing and tokenization rules for all models used in migration
- [ ] Clarify RBAC mapping from portal to FastAPI endpoints

Decisions (ADR links)
- [ ] ADR‑001: Target architecture and data model

## TODOs (Running)
- [ ] Prepare sample Mongo exports and anonymized datasets for mapping
- [ ] Draft initial SQL schema for Orders/Customers/Transactions
- [ ] Skeleton FastAPI package (routers/services/adapters) + CI
- [ ] POC: dual‑read adapter vs. one‑time backfill for Orders
- [ ] Define idempotency keys and outbox for messaging
- [ ] Observability baselines (logs, metrics, tracing)
- [ ] Security review (JWT, rate limiting, CSP, secrets)

## Usage & Billing Attribution
- Queue tasks from the portal with org/client/project set in the header filters.
- The assistants worker records token usage into `usage_events` with `operation=agents.jobs.complete` and attributes org_id, client_id, and project_id (via project_code).

