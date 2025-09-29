# Agent Guide for avnz-portal

This repository uses `SUMMARY.MD` as the authoritative, always‑up‑to‑date project brief. Before making changes, READ `SUMMARY.MD` end‑to‑end to understand the architecture, conventions, and recent changes. After making any substantive change, append a concise update to `SUMMARY.MD` (files touched, endpoints, migrations, secrets/env expectations, and access notes).

Key conventions
- Session budgeting
  - When remaining context budget reaches approximately 5%, proactively wrap up and complete in-flight tasks, summarize state, and finalize changes (Brave Mode applies: do the best safe default).
// Start-of-session checklist (for Codex/agents)
- On starting work in this repo, do the following before making changes:
  - Review docs for context: read `SUMMARY.MD` end‑to‑end, skim `README.md`, `AGENTS.md`, `BRAVE_MODE.md`, `TODOS.md`, and `CHANGELOG.md` if present.
  - Run local health checks to validate environment:
    - `bash scripts/health-check.sh` (db/redis/api)
    - `bash scripts/smoke-test.sh` (api/web/ai)
    - `bash scripts/walkthrough.sh` (non‑destructive)
  - Inspect recent logs for errors/warnings:
    - `docker compose ps`
    - `docker compose logs --since 15m api web` and scan for errors (e.g., auth, migrations, network).
  - If issues appear, consider a local reset (confirm first unless in Brave Mode):
    - `docker compose down -v --remove-orphans && docker system prune -af --volumes`
    - `docker compose up -d db && docker compose up -d --build api ai web ngrok`
- Modes
  - Brave Mode (Default): Proceed without prompting for routine confirmations. Assume consent for safe, expected actions and choose the best course per this guide. Always:
    - Log actions succinctly via commits and PR notes.
    - Use pre‑push checks (health, smoke, walkthrough).
    - Request escalated permissions for shell commands as needed with clear justification.
    - Rebuild Docker services and run health/smoke/walkthrough checks proactively to validate changes.
    - Do not ask the user to run Docker commands; automatically run required `docker compose` build/up/down/logs/exec commands to validate and apply changes.
    - Still explicitly call out and confirm destructive actions (e.g., volume prune/data wipes, force pushes) unless the user has already consented within the session context.
  - Cautious Mode (Opt-in): Ask before actions that could affect developer state or data. Use when the user explicitly requests a more conservative workflow.
  - Automation-First: Always seek to add safe, auditable bot automation for routine flows (queuing work from Jira, requeues, PR gating, QA hooks, docs updates). Prefer durable, env-gated defaults so teams can tune behavior per environment.
- PR Creation Policy (All Modes): Bots must not open PRs for a ticket until the assigned bot has completed the code and local checks pass (lint, health, smoke, walkthrough, hooks). Do not create draft PRs. Branches may be updated with commits during development; PRs are created only on "Code Complete".
  - When opening a PR, bots must ensure the latest commit message includes the ticket key and a clear signal of completion. If not present, add an empty commit with message: `AVNZ-###: Code complete` before creating the PR. Use `scripts/git/auto-pr-when-done.sh AVNZ-###`.
- Tooling & runtime
  - Docker is the local orchestrator. Agents may run `docker compose` commands (build, up, down, logs, exec) when needed to build, reset, or verify services.
  - Prefer containerized workflows; do not assume host Node/Python are installed.
  - When destructive (`down -v`, pruning), prompt or clearly communicate intent.
  - In Brave Mode, do not prompt the user to run Docker commands — execute them automatically as part of the workflow.
  - Pre‑push requirements (must pass locally):
    - `bash scripts/health-check.sh` (db/redis/api)
    - `bash scripts/smoke-test.sh` (api/web/ai)
    - `bash scripts/walkthrough.sh` (quick read-only portal walkthrough)
- Soft-deletes: When implementing any deletion, update `deleted_at` and avoid hard deletes. Ensure list/read queries exclude soft-deleted rows.
- Jira integration (required)
  - All new tasks must be tracked in Jira (project key `AVNZ`).
  - Reference the Jira issue key in commit messages: `AVNZ-123: concise description`.
  - In planning/updates, include the issue key for traceability.
  - AVNZ is a Team‑managed project; manage statuses via Board settings → Columns, not the classic global workflow editor. See `JIRA.md` for current steps.
  - See `JIRA.md` for setup and `BRAVE_MODE.md` for automation/quiet-mode conventions. Env vars: `JIRA_EMAIL`, `JIRA_DOMAIN`, `JIRA_API_TOKEN`.
  - PR gating env: set `AUTO_PR_WHEN_DONE=1` to allow bots to open PRs automatically when a ticket is marked code-complete; set `AUTO_PR_WHEN_DONE=0` to require manual PR creation.
  - Portal webhook: configure Jira Automation to POST to `/jira/events/:orgCode` with header `X-Jira-Secret`. Store secret under `/admin/secrets` → service `jira`, name `webhook_secret` (env `JIRA_WEBHOOK_SECRET` allowed for local dev).
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
  - Use shadcn/ui primitives for interactive UI (Popover, Tooltip, Dropdown, Sheet, Accordion, Dialog) instead of native title attributes or ad-hoc elements. Keep UI consistent and accessible.
  - UI consistency: All portal admin pages must match the look-and-feel of `/admin/clients` (page scaffolding, heading hierarchy, card layout, spacing, DataTable styling, and responsive behavior). New or updated admin pages should mirror Clients page patterns.
  - Design gate: Before adding any dashboard/admin page, read the design guidelines (see SUMMARY.MD) and ensure:
    - Use shadcn Dialog modals for create/edit/view/delete flows.
    - Use shadcn DataTable for tabular views; apply monospace for IDs/keys.
    - No hardcoded org codes/project keys/vendor URLs in templates; use placeholders or runtime values.
    - Place dashboard links under the Dashboard sections in the left navigation.

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
5) If the feature changes infrastructure (queues, workers, caches, secrets, DNS, roles), update Terraform under `terraform/` and any Helm/K8s manifests to keep IaC in sync.

If conflicts or ambiguity arise, prefer the patterns and requirements documented in `SUMMARY.MD`.
