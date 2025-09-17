# Agent Guide for avnzr-portal

This repository uses `SUMMARY.MD` as the authoritative, always‑up‑to‑date project brief. Before making changes, READ `SUMMARY.MD` end‑to‑end to understand the architecture, conventions, and recent changes. After making any substantive change, append a concise update to `SUMMARY.MD` (files touched, endpoints, migrations, secrets/env expectations, and access notes).

Key conventions
- Modes
  - Brave Mode: When explicitly requested by the user, proceed without prompting for confirmations. Assume consent for safe, expected actions and choose the best course per this guide. Continue to:
    - Log actions succinctly via commits and PR notes.
    - Use pre‑push checks (health, smoke, walkthrough).
    - Request escalated permissions for shell commands as needed with clear justification.
  - Default Mode: Ask before potentially destructive actions (volume prune, data wipes, force pushes).
- Tooling & runtime
  - Docker is the local orchestrator. Agents may run `docker compose` commands (build, up, down, logs, exec) when needed to build, reset, or verify services.
  - Prefer containerized workflows; do not assume host Node/Python are installed.
  - When destructive (`down -v`, pruning), prompt or clearly communicate intent.
  - Pre‑push requirements (must pass locally):
    - `bash scripts/health-check.sh` (db/redis/api)
    - `bash scripts/smoke-test.sh` (api/web/ai)
    - `bash scripts/walkthrough.sh` (quick read-only portal walkthrough)
- Security & compliance
  - Client/Wizard forms: always use `method="post"`; avoid querystring submissions.
  - Forgot password is non‑enumerating and redirects back to login with a neutral toast.
  - Secrets live in the DB (see Service Secrets below). Never hard‑code or commit secrets.
- Database migrations
  - Place new SQL migrations under `db/init` with next numeric prefix (e.g., `027_feature.sql`).
  - Write idempotent DDL where practical.
- API (NestJS ESM)
  - Add new controllers/endpoints under `apps/api/src`; export via `main.ts` module list if needed.
  - Use RBAC helpers already wired (e.g., `@Authz({ action: ..., domain: 'node', resourceType: 'org', resourceParam: 'nodeId' })`).
- Web (Next.js App Router)
  - Use SPA forms (React Hook Form + Zod) for admin UX and `/api/admin/proxy` for server mutations.
  - Toast errors and successes consistently.

Service Secrets (SOC2)
- Table: `service_configs(org_id, client_id?, service, name, value_enc)` with AES‑256‑GCM at rest.
- Helpers: `getServiceConfig()` for override → default and decryption.
- Admin endpoints (org‑scoped): `GET/POST/DELETE /admin/services/configs`.
- UI: `/admin/secrets` for managing org defaults and client overrides.

Templates
- Email/SMS templates stored in DB (`email_templates`, `sms_templates`) with client overrides, rendered with `{{var}}`.
- Admin endpoints: `GET/POST/DELETE /admin/templates/(email|sms)`.
- UI: `/admin/templates`.

Usage & Pricing
- Use `unitPrice(provider, model, metric, orgId, userId?, roles?)` for pricing.
- Track usage in `usage_events` and include cost_usd when possible.
- `/usage/summary` accepts `from`, `to`, `by`, and `projectCode` filters.

Dashboard
- Project selector stores `projectCode`; usage panels must respect it.
- Budget UI persists via `GET/POST /admin/budget`.

When adding features
1) Update schema via new `db/init/NNN_*.sql` migration.
2) Implement API handlers with RBAC guards.
3) Add/extend web UI, using SPA pattern + toasts.
4) Append an entry to `SUMMARY.MD` documenting the change.

If conflicts or ambiguity arise, prefer the patterns and requirements documented in `SUMMARY.MD`.
