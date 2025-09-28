# Project Summary and Implementation Transcript

This document summarizes the architecture, features, and the full sequence of changes implemented during this integration session. Going forward, any substantive change must be reflected here as a project requirement.

## Project Stack
- API: NestJS (TypeScript, ESM)
- DB: Postgres 15 + pgvector (usage + pricing), migrations under `db/init`
- Web: Next.js 14 (App Router), Tailwind UI, server actions + SPA forms (RHF + Zod)
- AI: FastAPI (not modified here)

## Security & Compliance
- SOC2 patterns for auth and forms:
  - All forms submit via POST; client-side forms explicitly include `method="post"`.
  - Forgot password flow: non-enumerating (always returns success), redirects to `/login?msg=reset-sent` with neutral toast.
  - CSP hardened: in dev, allow `unsafe-eval` + ws for HMR; prod remains strict.

## Soft-Delete Policy (Required)
- All deletions are soft-deletes across API and DB. Do not hard-delete domain data.
- Implementation rules:
  - Mutations that "delete" must set `deleted_at = now()` on the row instead of `DELETE`.
  - Read/list queries must exclude soft-deleted rows (add `deleted_at is null`).
  - For join/association resets (e.g., mapping tables) and retention tasks, hard deletes may be used where data is derived/ephemeral (e.g., audit log pruning by retention window).
- Existing coverage: `email_templates`, `sms_templates`, `service_configs`, and AuthZ tables (`authz.route_registry`, `authz.roles`, `authz.actions`, `authz.permissions`, `authz.role_assignments`, `authz.abac_fences`) include `deleted_at` and API endpoints updated accordingly.

## Email Delivery Architecture
- Enterprise choice: Transactional Outbox → AWS SQS → Mailer Worker → Provider (SendGrid/SMTP) with DLQ and retries. This decouples email from API latency and provides at-least-once delivery with observability.
- Implementation:
  - DB outbox: `outbox_emails` as source of truth + idempotency key.
  - SQS publisher: API publishes jobs when `SQS_QUEUE_URL` is set (`apps/api/src/queue.ts`), still writing outbox.
  - Workers:
    - Local/dev DB worker: `apps/api/src/workers/outbox-email.ts` (polls DB and sends).
    - Prod SQS worker: `apps/api/src/workers/sqs-mailer.ts` runs in EKS and consumes SQS; marks outbox rows as `sent` by idempotency key.
  - Terraform: `terraform/sqs.tf` creates a Standard queue and DLQ; `terraform/eks_irsa_mailer.tf` provisions IRSA role with SQS permissions.
  - KEDA: `argo/keda-mailer.yaml` defines ServiceAccount (annotated with IRSA), Deployment, and ScaledObject for queue length.
- Idempotency: outbox rows carry `idempotency_key` to avoid duplicates.

## Auth, Login, Logout
- Login: friendly business error messages; lock/429 returns descriptive text with retry guidance; 423 lock message.
- Logout: `/api/logout` clears cookies and redirects to `/login`.

## Auth: Password Reset (Queued)
- Endpoint: `POST /auth/request-reset` creates a 60-minute token and ENQUEUES an email to `outbox_emails` instead of sending inline.
- Worker: `npm run outbox:once` in `apps/api` processes pending outbox rows locally; production uses SQS + KEDA worker (`dist/workers/sqs-mailer.js`).
- User lookup: resolves `client_code` to org, then matches the user within that org via memberships.
- Dev behavior: returns `{ reset_token, expires }` in non-production for local testing; production omits the token (non-enumerating `{ ok: true }`).
- Reset endpoint: `POST /auth/reset` consumes the token, updates password, and revokes refresh tokens.

## SPA Forms + Toasts
- Converted admin create/update/delete flows to SPA using RHF+Zod and a proxy route.
- Added a global toast provider and wired success/error messages for all SPA submissions and end-user forms.

## Templates (Email/SMS)
- DB tables: `email_templates`, `sms_templates` with default `invite` templates and client override support.
- API endpoints (admin, RBAC-protected):
  - Email: `GET/POST/DELETE /admin/templates/email`
  - SMS: `GET/POST/DELETE /admin/templates/sms`
- Rendering: simple `{{var}}` replacement with vars: `url`, `clientName`, `orgName`, `orgNameSuffix`, `shortCode`.
- UI: `/admin/templates` to manage defaults and client overrides.
- Seeded defaults: `028_default_email_templates.sql` adds `invite` and `password_reset` defaults (client override supported). Variables: `{{url}}`, `{{clientName}}`, `{{orgName}}`, `{{orgNameSuffix}}`.

## Org Signup Defaults
- On `POST /orgs/register`, a default company (client) is created automatically under the new org (code mirrors `org.code`), and the registering user is added as a `client-admin` member.
- After successful signup, the Web app redirects to an Onboarding wizard (`/onboarding`) instead of `/admin`.

## Onboarding Wizard (Services)
- Path: `/onboarding`
- Steps: optional SendGrid (from, api_key), optional Twilio (account_sid, auth_token, from), optional AWS (region, SES from, optional access_key_id/secret_access_key for dev; prefer roles in prod).
- Validation: if a step has any value present, require all required fields for that service; otherwise allow Skip/Continue. For AWS, keys are optional but must be provided as a pair if used.
- Persistence: Uses SPA POSTs via `/api/admin/proxy` to upsert `service_configs` for the current org. Values are encrypted at rest as usual.
- After the final step, route to `/admin`. Wizard can be extended for additional services (AWS, etc.).

Enable SQS + KEDA (Prod)
- Terraform: apply `terraform/sqs.tf` and `terraform/eks_irsa_mailer.tf`. Capture outputs:
  - `sqs_queue_url`, `mailer_worker_irsa_role_arn`.
- KEDA install: add KEDA Helm release (not included here) or install via Argo; then apply `argo/keda-mailer.yaml`, replacing placeholders:
  - `REPLACE_MAILER_IRSA_ROLE_ARN`, `REPLACE_SQS_QUEUE_URL`, `REPLACE_AWS_REGION`, `REPLACE_API_IMAGE`.
- API env: set `SQS_QUEUE_URL` and `AWS_REGION` on the API deployment so it publishes jobs to SQS.

KEDA Install
- Terraform Helm release `terraform/keda_helm.tf` installs KEDA in `keda` namespace.
- Mailer worker manifests live in `argo/keda-mailer.yaml`; replace placeholders and apply via Argo or kubectl.

Helm Chart: Mailer Worker
- Chart supports optional `mailer` worker Deployment and KEDA ScaledObject:
  - Values: `mailer.enabled`, `mailer.image.repository|tag`, `mailer.env.SQS_QUEUE_URL`, `mailer.env.AWS_REGION`, `mailer.secretRef`, `mailer.irsaRoleArn`.
  - Templates: `charts/avnz-portal/templates/deployment-mailer.yaml`, `charts/avnz-portal/templates/keda-mailer.yaml`.
- API Deployment accepts `SQS_QUEUE_URL`, `SQS_DLQ_URL`, and `AWS_REGION` envs to publish jobs to SQS and expose SQS stats.

## KEDA Install
- Terraform Helm release `terraform/keda_helm.tf` installs KEDA in `keda` namespace.
- Mailer worker manifests live in `argo/keda-mailer.yaml`; replace placeholders and apply via Argo or kubectl.

## Admin Outbox UI
- New API: `GET /admin/outbox` (filters: status, q, limit/offset), `GET /admin/outbox/stats`, `POST /admin/outbox/:id/retry` (RBAC protected with `@Authz configure` on `nodeId`).
- Web UI: `/admin/outbox` lists queued/sent/failed jobs with Retry action for non-sent items.
- Purpose: observability and manual redrive for operational teams.
- Dashboard card includes SQS metrics (queued, in-flight, DLQ) when `SQS_QUEUE_URL`/`SQS_DLQ_URL` are configured.

## Dashboard
- Added Outbox stats card to Admin dashboard (pending/processing/failed counts) with link to the Outbox page.

## Argo Applications
- Added `argo/application-keda-mailer.yaml` to sync raw manifests under `argo/` (including `keda-mailer.yaml`). Replace placeholders `REPLACE_REPO_URL` and `REPLACE_TARGET_REVISION` to point to your Git repo and branch/tag.

## DB Reset (Local)
- Script: `scripts/db-reset.sh` wipes local Docker volumes and brings services back up, re-running migrations to reseed.

## Service Secrets (SOC2, Encrypted at Rest)
- DB table: `service_configs(org_id, client_id?, service, name, value_enc)` with AES-256-GCM encryption (`crypto.util.ts`).
- Admin endpoints: `GET/POST/DELETE /admin/services/configs` (org-scoped, RBAC configure).
- Resolution helper: `getServiceConfig()` chooses client override → org default; decrypts value.
- Web UI: `/admin/secrets` to manage SendGrid/Twilio/AWS etc. values by name.
- Access control: Org-only by default; clients cannot view without explicit org-granted role.

## Send Providers Integration
- SendGrid (Email): prefers SendGrid API (from DB secrets), falls back to SMTP.
- Twilio (SMS): credentials read from DB secrets.
- Both record usage events after sending (see Usage & Pricing).

## Usage & Pricing
- Pricing rules: `pricing_rules(scope, provider, model, metric, price_per_1k, …)`.
- New utility `unitPrice(provider, model, metric, orgId, userId?, roles?)` shares rule resolution logic.
- Usage events: email/sms sends add a row to `usage_events` with `embed_tokens=1000` so per-send cost equals price_per_1k; cost_usd computed via pricing rules.
- `/usage/summary` groups by provider/model/operation with filters (from, to, user, project, projectCode) and validates permissions.

## Admin Dashboard
- Post-org register: redirect to `/admin` (client creation now optional).
- First-run CTA: “Create your first client” when none exist.
- Header: breadcrumb + project selector (stored as `projectCode`) and export control.
- Usage chart panel: date range (from/to) + grouping selector; filtered by project; date range and grouping persist in localStorage.
- Metrics rail: monthly budget progress, total tokens, total requests.
- Budget: `budgets` table, `GET/POST /admin/budget` + inline editor in metrics panel.

## Branding & UI Settings
- Global app setting `portal_name` added in `app_settings` (seeded to `Avnz`), used in web layout header.
- Global app setting `use_shadcn` determines preference to style components using shadcn when possible.
- Public endpoint `GET /api/app-settings` exposes safe app settings to the web shell.

## Filters & Breadcrumbs
- Admin header now contains chained dropdowns: Org / Clients / Project / Users.
- Defaults to “All Orgs / All Clients / All Projects / All Users”.
- Each dropdown provides a search field. Selections persist in localStorage (keys: `orgFilter`, `clientFilter`, `projectCode`, `userFilter`).
- Usage panels read `projectCode`, `clientFilter`, `userFilter`, and date/grouping from localStorage and query `/usage/timeseries` (and summary where used) accordingly. `/usage/summary` and `/usage/timeseries` support `clientId` and `userId` filters.

## Charts Styling
- Usage charts now use a shadcn-style area chart powered by `recharts` (dependency added to web). Wrapper components live in `components/ui/chart.tsx`. The Dashboard Usage panel loads `/usage/timeseries` and renders an area chart.
- Endpoint: `GET /usage/timeseries?from&to&projectCode&clientId&userId&interval=day|week|month` for time-series data.

## Client Secrets Visibility (RBAC extension)
- New permission keys proposed (to be assigned via roles) to allow granting client-scoped, read-only visibility of secrets. Endpoints remain org-scoped by default; clients cannot view without explicit grant.


## Dev & Ops
- Docker Compose orchestrates db/api/web; API runs migrations on start.
- Health and startup ordering:
  - API exposes `GET /health` and has a compose healthcheck.
  - `db` healthcheck uses `pg_isready`; `redis` uses `redis-cli ping`.
  - `api` waits for healthy `db` and `redis`; `web` waits for healthy `api`.
- Web SSR API calls include a small retry/backoff (3 attempts) to smooth initial startup.
- Clean install: `docker compose down -v --remove-orphans && docker system prune -af --volumes` → `cp .env.example .env` → `docker compose build --no-cache` → `docker compose up -d`.
- Migrations: API startup logs show `Applying migration ...`; to reapply a migration manually delete row in `schema_migrations`.

Update 2025-09-16 (Docs)
- README: added "Full Reset & Health Check" and a new "Requirements" section noting Docker Desktop and that repo scripts/commands will run Docker when needed.
 - AGENTS.md: clarified agents may run `docker compose` to build/reset/verify services; prefer containerized workflows.
 - Added scripts: `scripts/health-check.sh`, `scripts/smoke-test.sh`, `scripts/walkthrough.sh`. README now has a "Pre‑push Requirements" section (must run/pass locally). AGENTS clarifies these are required before push.

Update 2025-09-17 (Docs)
- AGENTS.md: added a start-of-session checklist to review docs, run health/smoke/walkthrough checks, and inspect recent logs; fixed guide title to `avnz-portal`.
- README: added “Start-of-session checklist (Codex/agents)” under Requirements with docs review, health checks, and recent logs inspection.
 - Brave Mode: clarified that Docker commands should be executed automatically without asking; README notes this behavior and reserves prompts only for destructive operations.

Update 2025-09-17 (Web)
- Fixed runtime error in web logs: calling `makeSelectionColumn`/`makeDragColumn`/`makeActionsColumn` from Server Components caused issues due to Client Component export restrictions.
- Created client wrappers to construct columns and render tables:
  - `apps/web/app/admin/clients/ClientsTable.tsx`
  - `apps/web/app/admin/projects/ProjectsTable.tsx`
  - `apps/web/app/admin/invites/InvitesTable.tsx`
- Updated pages to use wrappers instead of importing helpers server-side:
  - `apps/web/app/admin/clients/page.tsx`
  - `apps/web/app/admin/projects/page.tsx`
  - `apps/web/app/admin/invites/page.tsx`
- Health/smoke re-run: OK; recent web logs show no runtime errors.

Update 2025-09-17 (Ops)
- Enhanced smoke test to also ping protected admin pages to force Next.js compilation and verify 200/302 responses when unauthenticated.
- Script updated: `scripts/smoke-test.sh` adds checks for `/admin`, `/admin/clients`, `/admin/projects`, `/admin/invites`.

Update 2025-09-17 (Lint)
- Prevent server components from importing the client `DataTable` directly. Added ESLint override to disallow importing `@/components/ui/data-table` in `apps/web/app/**/{page,layout,loading}.tsx` files. Use client-side wrappers instead (e.g., `*Table.tsx`).

Update 2025-09-17 (Docs)
- README: fixed project name to `avnz-portal` (was `avnzr-portal`).
- README: Quick start directs to `/` for first‑run registration, then `/admin/pricing` post‑login.
- README: Clarified provider secrets live in DB via `/admin/secrets`; env vars are optional for local overrides.
- README: Template defaults include both `invite` and `password_reset` keys.
- README: Removed inaccurate note about seeding dev users from `DEMO_USERS`; first admin is created via Register Org flow.

Update 2025-09-19 (Docs)
- README: Quick start mentions the Onboarding wizard after org registration; added a short "Email delivery (queued)" section noting DB outbox and optional SQS worker.

Update 2025-09-27 (Web)
- Fixed server-side fetch on RPS dashboard pages failing with "Failed to parse URL from /api/..." by constructing absolute URLs using request headers.
- Added helper `apps/web/lib/url.ts` exporting `absoluteUrl(path)`.
- Updated:
  - `apps/web/app/admin/dashboard/rps/orders/page.tsx`
  - `apps/web/app/admin/dashboard/rps/orders/[id]/page.tsx`
- No new endpoints or migrations. Behavior unchanged; resolves server runtime error in Node when calling internal API routes.

Update 2025-09-27 (Docs)
- AGENTS.md: Brave Mode set as the default operating mode. Agents run Docker build/up and health/smoke/walkthrough checks proactively without prompting; still call out destructive actions explicitly unless prior consent given.
- README.md: Clarified Brave Mode is default and reiterated destructive-action confirmation.
 - AGENTS.md: Added Jira integration guidance — all new tasks tracked in Jira (AVNZ), commit messages must include the issue key (e.g., `AVNZ-123:`), and pointers to `JIRA.md` and `BRAVE_MODE.md`.
 - JIRA.md: Updated for Team‑managed projects—manage statuses via Board settings → Columns; added direct links and current steps.

Update 2025-09-27 (Jira docgen backfill + proxy, quality fixes)
- Web admin proxy now permits Jira paths for controlled admin actions:
  - Updated `apps/web/app/api/admin/proxy/route.ts` to include `/jira` in `ALLOWED_PREFIX`.
- Added script `scripts/jira-docgen-backfill.sh` to find In Progress issues missing required details (Context, User Story, Acceptance Criteria, Testing & QA) or containing placeholders and to queue docgen jobs via the portal tasks API. Added `scripts/jira-docgen-needs-details.sh` to requeue tickets explicitly labeled `needs-details`.
- Operational notes:
  - Backfill: `curl -sS -H 'x-service-token: $SERVICE_TOKEN' -X POST ${API_BASE}/jira/backfill` queues jobs for all In Progress issues (deduped via `jira_jobs`). Also runs on startup and every `JIRA_BACKFILL_INTERVAL_SEC` seconds.
  - Docgen backfill: `bash scripts/jira-docgen-backfill.sh 'project = AVNZ AND status = "In Progress"'` queues tailored description generation for issues missing details; AI worker updates Jira description (ADF) and adds `auto-briefed` label.
- Validation on completion: If placeholders remain or required sections are missing, the API adds label `needs-details`, posts a reminder comment, and skips transitions. The create-issue webhook no longer overwrites descriptions; it posts a guidance comment and adds `needs-details` instead.
- No schema changes. Ensure env vars set: `JIRA_EMAIL`, `JIRA_DOMAIN`, `JIRA_API_TOKEN`, `SERVICE_TOKEN`, `JIRA_DEFAULT_ORG_CODE`, `JIRA_BACKFILL_ON_START=1`, `JIRA_BACKFILL_INTERVAL_SEC=300`.

Policy (Required) — Ticket Specificity Prior to Creation
- All new Jira tickets must include ticket-specific details before creation or immediately after (Context, Next Actions, Implementation Guidance, Testing & QA). Placeholders are not allowed.
- Portal enforcement: tickets missing details are labeled `needs-details` and cannot auto-transition. Docgen results containing placeholders are rejected.

Epic Standards (Required)
- EPIC descriptions must include: Epic Goal, Scope & Out of Scope, Deliverables, Milestones, Success Metrics, Stakeholders & Dependencies, Risks & Assumptions, and Definition of Done. The portal flags EPICs missing these sections with `needs-epic-details`.

Update 2025-09-28 (Jira Roles & Responsibilities)
- JIRA.md: added “Roles & Responsibilities” detailing jobs for Product Owner, Tech Lead/Architect, Web/API/AI Engineers, QA, DevOps/SRE, Security & Compliance, Designer/UX, PM/Scrum Master, and Data/Analytics. Included phase handoffs and assignment defaults via Admin → Secrets (service `jira`).
- Added a “Quick Assignment Guide” mapping common ticket types to the right role (e.g., RPS UI page → Web Engineer; API endpoint → API Engineer; AI router/docgen → AI Engineer; CI/infra → DevOps/SRE; Security → Security & Compliance; Design → Designer/UX; Test plans → QA).

Update 2025-09-28 (Assignment guardrails)
- Requirement: Company CTO (Bill Cuevas) must never be auto‑assigned. Portal assignment excludes CTO by default and honors `assignment_exclude` (Admin → Secrets → service `jira`) or env `JIRA_ASSIGNMENT_EXCLUDE`.
- Jira project should set Default assignee to Unassigned (or a bot), not the CTO.

Update 2025-09-28 (Branching & Merge Policy)
- Branch naming (bots):
  - Controlled by `GIT_WORK_BRANCH` (default `design-2`).
  - Epic: `<GIT_WORK_BRANCH>/<EPIC_KEY>` (e.g., `design-2/AVNZ-10`).
  - Child tickets: `<GIT_WORK_BRANCH>/<EPIC_KEY>/<TICKET_KEY>` (e.g., `design-2/AVNZ-10/AVNZ-12`).
- Flow:
  - Bots write code, commit, and open PRs to `main` (or configured base).
  - QA bots must pass (health/smoke/tests) before merge. Tickets require: Context, concrete User Story, AC, Testing & QA.
  - When child tickets under an epic are done and QA‑approved, merge child PRs into the epic branch; when all children are done, merge the epic branch into `design2`.
- Config:
  - Enable auto‑commit/PR via env: `AUTO_COMMIT=1`, `GIT_REMOTE_URL`, `GITHUB_TOKEN`, `GITHUB_REPO`, `GIT_MAIN_BRANCH`.

Update 2025-09-27 (Jira Backlog)
- Added Jira bulk-import CSV derived from SUMMARY.MD, TODOS.md, and RPS_TASK.md for Product Owner triage and parallel execution.
- Files:
  - `tasks/AVNZ-2025-09-27-backlog.csv` — issues ready for CSV import into project `AVNZ` (uses Epic Name/Epic Link for hierarchy; Assignee set to Emma Johansson).
  - `tasks/README.md` — instructions for CSV import and field mapping.
- No code/runtime changes. Purpose is to queue work via the tasks menu/Jira without impacting services.

Update 2025-09-27 (Jira RPS automation)
- Added `scripts/jira-import-rps.sh` to programmatically create the RPS Epic and child tasks in Jira (project `AVNZ`) and assign them to Emma Johansson.
- Implementation notes:
  - Uses Basic auth with `JIRA_EMAIL`/`JIRA_API_TOKEN`/`JIRA_DOMAIN`.
  - Creates Epic with summary “RPS FastAPI CSV & Web Proxies”, then Tasks linked via `parent` to the Epic (team‑managed compatible).
  - Fields kept minimal due to team‑managed screens (no Epic Name/Epic Link/components on create).
- Result: Created new Epic and Tasks (keys printed during run). Re‑run safe; will create another Epic and child tasks.

Update 2025-09-27 (Tasks visibility)
- AI service now surfaces recently completed jobs in `/agents/jobs` by maintaining a Redis list `agents:jobs:recent`:
  - Files: `apps/ai/app/assistants/jobs.py`, `apps/ai/app/assistants/worker.py`, `apps/ai/app/main.py`.
  - Worker pushes job IDs on done/error/canceled. The list endpoint de‑dups queued + recent and returns up to `limit`.
- Web proxy fixed to preserve POST body for tasks (was dropping `task` content):
  - File: `apps/web/app/api/agents/jobs/route.ts` — switched to `req.text()` parsing to avoid body loss.
- Added `scripts/jira-annotate-rps.sh` to comment portal job links on the latest RPS Epic and tasks and auto‑transition tasks to In Progress.

Update 2025-09-27 (AI worker service + UI)
- Docker Compose: added `aiworker` service that runs `python -m app.assistants.worker` to process queued jobs.
  - File: `docker-compose.yml` (service `aiworker` with Redis and API env wiring).
- Tasks UI: split into separate “Queue” and “Recent completed” sections to mirror admin patterns and improve clarity.
  - File: `apps/web/app/admin/dashboard/tasks/page.tsx`.

Update 2025-09-27 (Jira automation + backfill)
- Added Jira → Portal automation and Portal → Jira callbacks for maximum hands‑off flow.
- New DB: `db/init/040_jira_jobs.sql` tracks one portal job per Jira issue (org-scoped, soft delete) to dedupe.
- API webhook receiver: `POST /jira/events/:orgCode` (header `X-Jira-Secret`) stores events in `jira_events` and auto‑queues a portal job when an issue transitions to “In Progress”.
- Worker callback: `POST /jira/agents-complete` (header `x-service-token`) accepts job completion, updates `jira_jobs.status`, posts a comment to the Jira issue (usage + brief plan/impl/review), and optionally transitions to `JIRA_TRANSITION_ON_COMPLETE` (default `In Review`).
- Assignment: On queue and per-phase completion, the API assigns issues based on per‑org config (Admin → Secrets: `service=jira`, names `assignee_dev/review/qa/test/audit`), with optional field overrides (`JIRA_REVIEWER_FIELD_ID`, etc.). No assignee names are hardcoded in code.
- Backfill: on startup (`JIRA_BACKFILL_ON_START=1`) and optional polling (`JIRA_BACKFILL_INTERVAL_SEC`), API queries Jira (`JIRA_PROJECT_KEY`) for all `In Progress` issues and queues any missing jobs (uses `JIRA_DEFAULT_ORG_CODE` to resolve org).
- Env vars added/used:
  - `JIRA_WEBHOOK_SECRET` (fallback if no per‑org secret)
  - `SERVICE_TOKEN` (API/worker internal auth)
  - `JIRA_BACKFILL_ON_START=1`
  - `JIRA_BACKFILL_INTERVAL_SEC=300` (optional)
  - `JIRA_PROJECT_KEY=AVNZ`
  - `JIRA_DEFAULT_ORG_CODE=<org_code>`
  - `JIRA_TRANSITION_ON_COMPLETE=In Review`
- Files changed:
  - API: `apps/api/src/jira.controller.ts` (webhook receiver, agents-complete callback, manual backfill trigger)
  - API: `apps/api/src/jira-backfill.ts` (Jira search + auto-queue)
  - API: `apps/api/src/main.ts` (backfill on start + polling)
  - Worker: `apps/ai/app/assistants/worker.py` (callback to API when done)
- Scripts:
  - `scripts/jira-move-inprogress.sh` — convenience to move issues into In Progress (triggers automation)
  - `scripts/test-openai-key-local.sh` — local cURL key test
  - `scripts/jira-annotate-rps.sh` — annotate RPS issues with portal job links and move tasks (manual helper)

Update 2025-09-27 (Jira)
- Added scripts to automate and verify Jira setup:
  - `scripts/jira-board-ensure.sh` ensures AVNZ filter/board exist and prints board configuration.
  - `scripts/jira-verify-access.sh` lists group members, project roles, and boards for AVNZ.
  - `scripts/jira-create-project.sh` (admin-required) creates the AVNZ software project using the Scrum template.
- Attempted bootstrap: group `avnz-app-team` exists and is populated. Could not verify project `AVNZ` or create board due to 404/permissions. Next step: confirm project exists or authorize project creation, then rerun ensure/verify scripts.

Update 2025-09-27 (Confluence script fix)
- Hardened `scripts/confluence-needs-access.sh` to avoid hangs:
  - Added curl timeouts/retries and a hard page limit.
  - Fixed pagination: break on `total` bound or empty page when `isLast` is unavailable.
  - Quote-safe array handling. Script now returns promptly with results.

Update 2025-09-27 (Jira → Portal Webhook)
- API: Added Jira webhook support and events listing
  - New table: `jira_events` (039_jira_events.sql) with org-scoped, soft-deleted storage of incoming Jira events.
  - New endpoint: `POST /jira/events/:orgCode`
    - Auth: shared secret header `X-Jira-Secret` (or `X-Jira-WebHook-Secret`).
    - Secret lookup: `service_configs` → service=`jira`, name=`webhook_secret` (org default), falling back to `JIRA_WEBHOOK_SECRET` env for local.
    - Body: accepts Jira Automation “Send web request” JSON; stores `issue_key`, `issue_id`, `event_type`, `actor`, and full payload.
  - Admin list: `GET /jira/events` (org-scoped; RBAC parity with Slack events list).
- Jira Automation configuration (per AVNZ project):
  - Create rule(s): Issue created/updated/transitioned → Send web request.
  - URL: `https://<public-api-base>/jira/events/<orgCode>` (use ngrok base in dev)
  - Method: POST; Headers: `X-Jira-Secret: <shared-secret>`
  - Body: `{{issue}}` wrapped with useful metadata, e.g.: `{ "event": "{{triggerIssueEvent}}", "issue": {{issue}}, "user": {{initiator}} }`
- Ngrok: start tunnel (compose service `ngrok`) and use the printed public base; set the secret under `/admin/secrets` → service `jira`, name `webhook_secret`.

Update 2025-09-27 (Docs)
- AGENTS.md: start-of-session checklist now explicitly includes `BRAVE_MODE.md` as a required doc to skim at project start.

Update 2025-09-19 (Web)
- Added user Settings scaffold with two-pane shell and header avatar menu.
- Routes: `/settings/profile`, `/settings/password`, `/settings/appearance` with left nav and bottom-left account switcher.
- Header: avatar-triggered dropdown with account header, Settings link, and Log out.
- Theme: default is now Light for first-time visitors; Appearance page previews changes instantly and persists via `/me/preferences` (localStorage fallback).
- Files:
  - `apps/web/components/ui/avatar.tsx`
  - `apps/web/components/header/HeaderUserMenu.tsx`
  - `apps/web/app/settings/{layout.tsx,page.tsx}`
  - `apps/web/app/settings/profile/{page.tsx,profileForm.tsx}`
  - `apps/web/app/settings/password/page.tsx`
  - `apps/web/app/settings/appearance/page.tsx`
  - Updated `apps/web/app/layout.tsx` and `apps/web/components/ThemeProvider.tsx`
- Admin Settings route now redirects to the new shell:
  - `apps/web/app/admin/settings/page.tsx` → redirects to `/settings/profile` (left menu layout).
- Added Org Management menu item (org managers only):
  - Sidebar renders "Org Management" linking to `/admin/organization` when user has the `org` role.
  - Files: `apps/web/app/admin/layout.tsx`, `apps/web/components/admin/SideNav.tsx`, `apps/web/app/admin/organization/page.tsx`.
  - Org page adds org edit form (name + code) and embeds client management (create/search/list) using existing components. Files: `apps/web/app/admin/organization/ui/OrgEditForm.tsx`, `apps/web/app/admin/organization/page.tsx`, `apps/web/app/admin/organization/ui/OrgAuditTable.tsx`.
  - Added read-only audit log panel with user email; includes client-side pagination (Load more).

Update 2025-09-19 (API)
- Added `POST /me/change-password` endpoint:
  - Verifies current password, validates new password against policy, updates hash, and revokes existing refresh tokens.
  - Used by the new Settings → Password page via `/api/admin/proxy`.
  - Added `POST /orgs/update` endpoint for org managers to update org name and code (validates uniqueness/pattern; updates legacy users.org_id; audits before/after).
  - Added `GET /orgs/audit` endpoint to fetch audit events with user_email, supports `limit`/`offset` (org managers only).
 - RBAC / Access
  - portal-manager canonical bypass in both global guards (RbacGuard and route-guard middleware) ensures portal-manager can access all guarded routes (existing and new) without extra config.
  - Org registration issues JWT roles `['org','portal-manager']` only for the creator. No automatic portal-manager mapping on login/refresh for other users.
  - RbacGuard is now global (APP_GUARD) so new controllers automatically use the same policy.

Update 2025-09-26 (Billing Schema)
- Added initial Billing domain translation from external CRM (Mongo ODM) to Postgres.
- New migration: `db/init/034_billing_core.sql` creates tables:
  - `billing_products`, `billing_customers`, `billing_addresses`, `billing_orders`,
    `billing_order_items`, `billing_transactions`, `billing_tracking_numbers`,
    `billing_affiliates`, `billing_promotions`.
  - All tables include `org_id` (FK), optional `client_id` where relevant, timestamps, and `deleted_at` for soft-delete.
  - Common indexes on `org_id`, `client_id`, `created_at`, and `deleted_at` plus order-specific keys (order_number, state, shipped, email_sent).
- API types: added `apps/api/src/billing/types.ts` with TypeScript interfaces mirroring the new schema (Order, OrderItem, Product, Customer, Address, Transaction, TrackingNumber).
- Notes:
  - Embedded/nested Mongo structures (addresses, source/origin, promotions, geo) are represented via normalized tables and JSONB fields for incremental adoption.
  - Future work: add NestJS controllers and services for CRUD + RBAC, and web admin pages for browsing orders/products.

Update 2025-09-26 (Billing API + Web)
- API: added `apps/api/src/billing.controller.ts` with list endpoints (org-scoped, RBAC-checked via perms/admin):
  - `GET /billing/orders` → id, order_number, state, total_amount, currency, email, customer_id, created_at
  - `GET /billing/customers` → id, first_name, last_name, email, created_at
  - `GET /billing/transactions` → id, order_id, state, amount, currency, processor, response_code, created_at
  - Requires org context; allows `admin`/`manage_projects`/`view_usage` or `portal-manager` bypass.
- Web: updated Billing menu ordering and added Transactions page.
  - Menu (Admin → Billing): Reports, Orders, Customers, Transactions, Carts, Tax Rates.
  - Pages render simple server-side lists using `apiFetch`:
    - `apps/web/app/admin/dashboard/billing/orders/page.tsx`
    - `apps/web/app/admin/dashboard/billing/customers/page.tsx`
    - `apps/web/app/admin/dashboard/billing/transactions/page.tsx`

Update 2025-09-26 (Billing Details + Search/Pagination)
- API: `GET /billing/orders/:id` returns order detail with items, transactions, tracking, customer, and addresses.
- Web: added order detail page `apps/web/app/admin/dashboard/billing/orders/[id]/page.tsx` and linked from list.
- Web lists: added debounced search and simple pagination (Prev/Next) for Orders, Customers, Transactions using client `SearchBox` component:
  - `apps/web/components/admin/SearchBox.tsx`
  - Updated list pages to accept `q`, `limit`, `offset` query params and render Next/Prev controls.

Update 2025-09-26 (Billing Filters + RBAC)
- API
  - Enabled CSV export for billing lists via `?format=csv`.
  - Added `processor` filter to `GET /billing/transactions`.
  - Route guard: org-scoped list routes now resolve `nodeId` from the authenticated `orgUUID` when a param is not provided.
  - Migration `035_authz_billing_routes.sql`:
    - Seeds `authz.permissions` for (`node`,`org`,`read`) with min role = `OrgStaff`.
    - Registers org-scoped billing list routes in `authz.route_registry` with (`GET /billing/(orders|customers|transactions)`, action `read`, `resource_param: nodeId`).
- Web
  - Added `DateRangeTodayFilter` (Today toggle + from/to + CSV export link): `apps/web/components/admin/DateRangeTodayFilter.tsx`.
  - Added `QuerySelect` for query-param-driven dropdowns: `apps/web/components/admin/QuerySelect.tsx`.
  - Orders page: state dropdown; Transactions page: processor dropdown.

Update 2025-09-26 (Billing DataTables-only UX)
- Simplified billing list pages to use DataTable controls only (client-side sorting/pagination), removing separate search/date/sort UI.
- Pages now default to display “Today” (server fetch sets from/to for current day), then DataTables handle client interaction:
  - Orders: `apps/web/app/admin/dashboard/billing/orders/page.tsx`
  - Customers: `apps/web/app/admin/dashboard/billing/customers/page.tsx`
  - Transactions: `apps/web/app/admin/dashboard/billing/transactions/page.tsx`

## Environment & Config Migration
- .env.example now only needs minimal boot config; service secrets (SendGrid/Twilio/AWS) should be stored in DB service_configs.
- SendGrid placeholders: `SENDGRID_API_KEY`, `SENDGRID_FROM` (optional if using DB secrets).
- Twilio placeholders: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (optional if using DB).
- Invite URL base: `INVITE_ACCEPT_URL_BASE` or `PUBLIC_BASE_URL`.

## Files Touched (Key)
- API
  - `src/mailer.ts` (SendGrid via DB, usage tracking)
  - `src/sms.ts` (Twilio via DB, usage tracking)
  - `src/admin.controller.ts` (templates, secrets, budget)
  - `src/service-config.ts`, `src/crypto.util.ts`, `src/pricing.util.ts`
  - `src/spec.controller.ts` (pass orgId/clientId to email/sms)
  - `src/usage.controller.ts` (summary filtering)
  - Migrations: `024_message_templates.sql`, `025_service_configs.sql`, `026_budgets.sql`
- Web
  - Admin shell/layout + dashboard (`/admin/layout.tsx`, `/admin/page.tsx`, `/admin/DashboardUsage.tsx`)
  - New pages: `/admin/templates`, `/admin/secrets`
  - Post‑signup redirect (`/app/api/register/org/route.ts`, `RegisterOrgForm.tsx`)
  - Toasts + SPA forms across admin and end-user flows
  - Middleware CSP in dev; logout redirect to login

## Ongoing Requirement
Every time new features are implemented or behavior is changed, update this SUMMARY.MD with:
- What changed (feature/bug/security)
- Files touched and endpoints added/modified
- Any new env vars or service configs (and whether they should go to DB secrets)
- Migration files added
- Any UI routes or access-control notes
- Any infrastructure/IaC updates required (Terraform/Helm/K8s); ensure Terraform under `terraform/` is kept up to date when architecture changes (e.g., new queues/workers/secrets/DNS/permissions).
- UI components: prefer shadcn/ui primitives (Popover, Tooltip, Dropdown, Sheet, Accordion, Dialog) for interactions and help text. Avoid native title-only hints; implement accessible popovers/tooltips.
- UI consistency: All portal admin pages must match `/admin/clients` look-and-feel (layout, spacing, cards, headings, DataTable patterns). Use the Clients page as the visual and structural reference for new/updated admin pages.

UI Modals (New Requirement)
- All create/edit/view/delete interactions should use shadcn Dialog modals for consistency and accessibility.
- Apply to admin dashboards and settings forms (Jira, Secrets, Pricing, etc.).

Design Guidelines (Required)
- All pages must follow the design system used by `/admin/clients` (cards, headings, spacing, DataTable styling, responsive layouts, shadcn components).
- Do not hardcode organization codes, project keys, or vendor URLs in templates. Derive or present placeholders (e.g., `/jira/events/:orgCode`).
- Dashboard pages should appear under the Dashboard menu on the left and match typography and sizes used across admin pages.
- Docgen/Issue Content (Required): Never use placeholder content (e.g., "As a <role>", "<capability>", "Criteria 1"). All generated/edited content must be ticket‑specific. The portal enforces this by forbidding placeholders in prompts, rejecting placeholder‑containing results, and labeling tickets `needs-details` until concrete details are present.

Design Gate (Before Adding Pages)
- Before adding or modifying any dashboard/admin page:
  - Read the design guidelines in this SUMMARY and mirror `/admin/clients` structure.
  - Use shadcn Dialog modals for create/edit/view/delete flows.
  - Use shadcn DataTable for tabular data with monospace for IDs/keys.
  - Validate no hardcoded codes/URLs; use placeholders or fetch at runtime.
  - Place links under the Dashboard sections in the left navigation.

This SUMMARY.MD is the authoritative project summary file read by future runs of OpenAI Codex in this repo.

## Mobile-Friendly Requirement (Required)
All pages must be mobile friendly. Instructions:

1. Viewport
- Add: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />` to your main layout head.

2. Tailwind container + globals
- Enable centered container + mobile padding in `tailwind.config.ts`.
- In `globals.css`: add `.sa-top`, `.sa-bottom` using `env(safe-area-inset-*)`, set `body { overflow-x: hidden }`, create `.touchable { min-height: 40px; padding: 0.5rem 0.75rem; }`.

3. Install shadcn primitives
- `npx shadcn@latest add sheet dialog dropdown-menu popover tooltip tabs input button separator badge`.

4. App shell
- Header: desktop nav shown on `md+`, mobile nav uses `Sheet` with a menu button.
- Main: wrap pages with a container; use `py-4 md:py-6`.
- Footer: apply `.sa-bottom`.

5. Responsive layout rules
- Mobile-first classes; scale up with `sm: md: lg:`.
- Replace fixed widths with `w-full` and `max-w-*`.
- Lists/cards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.

6. Forms
- Stack on mobile: `flex flex-col gap-2 md:flex-row md:items-center`.
- Inputs/buttons: `w-full` on mobile; constrain with `sm:w-48/64` on larger screens.

7. Overlays
- Use `Sheet` for mobile navigation/filters (e.g., `side="left"` or `side="bottom"`).
- Reserve `Dialog` for focused tasks (confirm/create).

8. Touch + typography
- Apply `.touchable` to small action targets.
- Text scales: `text-sm md:text-base lg:text-lg`.

9. Overflow + media
- Prevent horizontal scroll; add `break-words`/`truncate` to long labels.
- Images: `max-w-full h-auto` (or Next `<Image>` with fit).

10. Accessibility
- Keep labels, `aria-*`, and focus states intact when customizing shadcn components.

11. QA checklist
- No horizontal scroll on iPhone/Android.
- Tap targets ≥ 40px.
- Nav collapses to `Sheet` on `< md`.
- Forms usable with on-screen keyboard; overlays scroll within `85dvh`.
- Lighthouse Mobile: Performance ≥ 80, Accessibility ≥ 90.

## UI Conversion to shadcn components
- Added `components/ui/table.tsx` and converted tables in:
  - `/admin/clients`, `/admin/projects`, `/admin/members`, `/admin/project-members`, `/admin/pricing`, `/admin/invites` (and continue converting others similarly).
- Tables now use shadcn-style primitives for consistent styling with the rest of the UI.

## Admin Tables Conversion (shadcn + Org Context)
- Converted remaining admin views to shadcn Table components with basic sorting and existing pagination links:
  - `/admin/authz/routes`, `/admin/authz/roles`, `/admin/authz/permissions`, `/admin/authz/assignments`, `/admin/authz/actions`, `/admin/authz/nodes`, `/admin/authz/abac`
  - Also updated `/admin/templates` and `/admin/secrets` to use shadcn Table.
- Sorting: added column header links that toggle `?sort=field&dir=asc|desc` (client-side sort in page for now).
- Org context dropdown now affects server-rendered pages:
  - New route `POST /api/admin/context` (web) sets cookies: `orgFilter`, `clientFilter`, `projectCode`, `userFilter`.
  - Admin pages read `orgFilter` cookie and pass as `nodeId` when present; falls back to session org.

Files touched
- Web
  - Added `apps/web/app/api/admin/context/route.ts` (sets context cookies)
  - Updated `apps/web/app/admin/layout.tsx` (dropdowns set context via API)
  - Updated shadcn table conversions and sorting in:
    - `apps/web/app/admin/authz/routes/page.tsx`
    - `apps/web/app/admin/authz/roles/page.tsx`
    - `apps/web/app/admin/authz/permissions/page.tsx`
    - `apps/web/app/admin/authz/assignments/page.tsx`
    - `apps/web/app/admin/authz/actions/page.tsx`
    - `apps/web/app/admin/authz/nodes/page.tsx`
    - `apps/web/app/admin/authz/abac/page.tsx`
    - `apps/web/app/admin/templates/page.tsx`
    - `apps/web/app/admin/secrets/page.tsx`

Access & semantics
- Server page data fetches now respect `orgFilter` cookie for `nodeId` scoping.
- No API changes required; existing admin endpoints already accept `nodeId` query param.

## Header Dropdowns and Visibility
- Converted admin header dropdowns to searchable dropdowns (Org, Clients, Projects, Users) with inline search.
- Removed user email and selected org name from the header for a cleaner, non-identifying header.
- New cookie-backed context setter `POST /api/admin/context` is triggered on dropdown changes.

## Docs
- Updated `README.md` with a Status section linking to `SUMMARY.MD` as the authoritative brief and to `TODOS.md` for pending work.
- Added `TODOS.md` with a concise, high-level checklist across API, Web, Ops, and Security.

## Mobile Layout Implementation
- Added viewport meta in `apps/web/app/layout.tsx` head and safe-area helpers in `globals.css`.
- Prevented horizontal scroll via `body { overflow-x: hidden }`; added `.touchable` utility.
- Admin shell responsive behavior:
  - Desktop sidebar persists (`md+`); hidden on mobile.
  - Mobile navigation now uses a shadcn-style `Sheet` component (`components/ui/sheet.tsx`) in `apps/web/app/admin/layout.tsx`.
  - Wrapped admin content in `container` with `py-4 md:py-6`.
  - Mobile menu sections use an accordion pattern (`components/ui/accordion.tsx`).
- Tables render as cards on mobile (`md:hidden` card lists) across admin pages: routes, roles, permissions, assignments, actions, nodes, abac, templates, secrets.

Dependencies
- Web: installed `@radix-ui/react-dialog` and `@radix-ui/react-accordion` for official shadcn Sheet and Accordion primitives.
- Components:
  - `components/ui/sheet.tsx` (Radix Dialog-based Sheet)
  - `components/ui/accordion.tsx` (Radix Accordion)

## PWA Integration
- Added installable PWA support with offline fallback.
- Files:
  - `apps/web/public/manifest.webmanifest`
  - `apps/web/public/sw.js` (service worker)
  - `apps/web/public/offline.html` (offline fallback)
  - `apps/web/public/icon.svg`, `apps/web/public/icon-192.png`, `apps/web/public/icon-512.png`, `apps/web/public/apple-touch-icon.png`
  - `apps/web/components/PwaRegister.tsx` (client SW registration)
  - Updated `apps/web/app/layout.tsx` to include manifest, icons, theme-color, and registration component.
- Behavior:
  - Network-first for navigations with offline fallback.
  - Cache-first for Next static assets and icons.
  - Network-first with cache fallback for same-origin `GET /api/usage/{summary,timeseries}` to improve offline metrics.

## UI Components (Radix)
- Added UI wrappers:
  - `components/ui/sheet.tsx` (Radix Dialog)
  - `components/ui/accordion.tsx` (Radix Accordion)
  - `components/ui/popover.tsx` (Radix Popover) — used for searchable filter dropdowns
  - `components/ui/dropdown-menu.tsx` (Radix Dropdown) — used for Usage "Group by"
  - `components/ui/badge.tsx`
- Header filter dropdowns now use Popover with search input and selectable list.
  - Active filters show a small `Badge` indicator (privacy-safe, selection names hidden).

## API Proxies (Web → API)
- New Next.js routes to proxy usage endpoints for SW caching:
  - `app/api/usage/summary/route.ts`
  - `app/api/usage/timeseries/route.ts`
- Updated `app/admin/DashboardUsage.tsx` to call same-origin API for timeseries and summary.

## Service Worker TTL
- Added `TTL_MS=600000` (10 minutes) for usage endpoint caching in `public/sw.js`.

## Dependency Updates
- Web: upgraded Next.js to `14.2.32` to address advisories and maintain compatibility.
## Repo Hygiene
- Added a root `.gitignore` covering Node/Next/Nest, Python, logs, env files (keeps `.env.example`), build artifacts, OS files, and common caches.
- Defaults added: `.eslintcache`, `.cache/`, `/.pnpm-store/`, `.next/cache/`, `.python-version`, `.ruff_cache/`, `.ipynb_checkpoints/`.
- Ignoring editor settings by default: `.vscode/` and `.idea/` are ignored to avoid committing local workspace artifacts.
- Redis
  - Added `redis` service to docker-compose for local rate limiting/caching.
  - API rate limiter uses Redis if `REDIS_URL` is set; falls back to in-memory otherwise.
  - For AWS, provision ElastiCache Redis (see `terraform/redis.tf`).
- Added `terraform/` skeleton for AWS deployment (VPC, ALB+CloudFront+WAF, ECS, RDS, Redis, ECR).

Update 2025-09-23 (API, Tests)
- API: Aligned admin deletions with soft-delete policy and ensured lists exclude deleted rows where applicable.
  - Email templates: `DELETE /admin/templates/email/:id` now sets `deleted_at` instead of hard-deleting.
  - SMS templates: `DELETE /admin/templates/sms/:id` now sets `deleted_at` instead of hard-deleting.
  - Service configs: `GET /admin/services/configs` now filters out soft-deleted rows (`deleted_at is null`).
  - Route registry, Roles, Actions, Permissions, Role Assignments, ABAC fences updated to soft-delete and list-filter:
    - Endpoints affected: `/admin/routes`, `/admin/roles`, `/admin/actions`, `/admin/permissions`, `/admin/assignments`, `/admin/abac`.
  - Spec controller role revoke now soft-deletes `authz.role_assignments`.
  - Files: `apps/api/src/admin.controller.ts`, `apps/api/src/spec.controller.ts`.
- Tests: Fixed templates E2E to avoid double-reading fetch bodies which caused false negatives and a 500 on delete.
  - File: `apps/api/test/templates-integration.mjs`.
- Tests: Added soft-delete E2E covering actions, roles, permissions, ABAC fences, and route registry.
  - File: `apps/api/test/soft-deletes.mjs`; wired into `scripts/api-admin-access-test.sh`.
- Validation: Rebuilt API container and ran health/smoke/walkthrough scripts; all passed. Templates E2E now passes end-to-end (create, list, preview, soft-delete).

Update 2025-09-23 (Web)
- Admin AuthZ pages now support soft-delete visibility and restore actions:
  - Added Show/Hide deleted toggles and Restore buttons to:
    - Roles: `apps/web/app/admin/authz/roles/page.tsx`
    - Actions: `apps/web/app/admin/authz/actions/page.tsx`
    - Permissions: `apps/web/app/admin/authz/permissions/page.tsx`
    - Assignments: `apps/web/app/admin/authz/assignments/page.tsx`
    - Routes: `apps/web/app/admin/authz/routes/page.tsx` (+ `RouteRowEditor` restore)
    - ABAC fences: `apps/web/app/admin/authz/abac/page.tsx`
- Components:
  - `apps/web/components/admin/forms/RouteRowEditor.tsx` updated to show Restore when a route is soft-deleted.
- Behavior:
  - When “Show deleted” is enabled, lists include rows with `deleted_at`; deleted rows show a Deleted badge and a Restore action that clears `deleted_at` via new API restore endpoints.

Update 2025-09-23 (Admin Shell)
- Sidebar and Header UX updates to match external screenshots:
  - Added a top header with brand and a collapse toggle button.
  - Implemented collapsible sidebar: expanded shows full sections; collapsed shows an icon-only rail.
  - Renamed “Overview” to “Dashboard”. Under Dashboard:
    - Added “Portal” (existing dashboard) and new “Billing” dashboard.
    - Added a Billing submenu with: Orders, Roles, Permissions, Reports, Tax Rates, Cart.
- Files:
  - `apps/web/app/admin/layout.tsx` (collapsed state, top menu, Dashboard/Billing structure)

Update 2025-09-25 (Admin Nav)
- Sidebar/Navigation changes to align with new admin IA:
  - Moved Billing under Projects section in nav order; Dashboard now keeps Portal only.
  - Billing menu trimmed and expanded:
    - Removed Roles and Permissions from Billing menu.
    - Added Customers under Orders.
    - Renamed Cart to Carts (label only).
  - Removed "portal-crm" label from the admin header.

Update 2025-09-27 (Slack + ngrok Dev)
- Schema: added `db/init/038_slack_events.sql` creating `slack_events` (org-scoped, soft-delete) and RBAC route seed for `GET /admin/slack/events`.
- API:
  - Added `apps/api/src/slack.controller.ts`.
    - `POST /slack/events/:orgCode` receives Slack Events API webhooks. Verifies `X-Slack-Signature` using org-scoped service config `service=slack`, `name=signing_secret`. Handles `url_verification` challenge and logs `event_callback` payloads into `slack_events`.
    - `GET /slack/events` (admin, RBAC) lists recent events for the current org.
  - Updated `apps/api/src/main.ts` to capture raw request bodies for signature verification and to register `SlackController`.
- Web:
  - Added Dashboard → Slack page at `apps/web/app/admin/dashboard/slack/page.tsx` showing ngrok setup instructions, the endpoint path `/slack/events/:orgCode` and recent logged events.
  - Added nav link under Dashboard → Slack in `apps/web/app/admin/layout.tsx`.
- Dev (ngrok):
  - Added optional `ngrok` service to `docker-compose.yml` to tunnel `api:3001` (set `NGROK_AUTHTOKEN` in `.env`).
  - New `.env.example` entries: `NGROK_AUTHTOKEN`, `NGROK_PUBLIC_URL` (to render the full Slack Request URL in the UI).
- Scripts:
  - `scripts/slack-test.sh` sends signed Slack Events (url_verification or message) to the local webhook for testing. Usage:
    - `./scripts/slack-test.sh challenge -o ORG_CODE -s SIGNING_SECRET [-a API_BASE]`
    - `./scripts/slack-test.sh message "Hello" -o ORG_CODE -s SIGNING_SECRET [-a API_BASE]`
- Secrets: store Slack signing secret via Admin → Service Secrets with `service=slack`, `name=signing_secret` (AES‑256‑GCM at rest).
- Endpoints summary:
  - Public webhook: `POST /slack/events/:orgCode` (Slack → API via ngrok)
  - Admin list: `GET /slack/events?limit&offset` (org-scoped, RBAC)
  - Repositioned the sidebar collapse toggle next to the Org filter in the admin header.
  - Hid the global admin nav toggle button in the top header (mobile Sheet trigger no longer shown).
- Files:
  - `apps/web/app/admin/layout.tsx`
  - `apps/web/app/layout.tsx`
  - `apps/web/app/admin/dashboard/billing/customers/page.tsx`
 - Collapsed sidebar updated to use the same icon set as the expanded menu and link targets aligned with main sections (Dashboard, Tenants, Projects, Billing→Orders, Access, Usage, Templates, Security).
  - `apps/web/app/admin/dashboard/billing/{page.tsx,orders/page.tsx,roles/page.tsx,permissions/page.tsx,reports/page.tsx,tax-rates/page.tsx,cart/page.tsx}`

Update 2025-09-23 (Templates & Secrets)
- API: added include_deleted and restore support for templates and service configs.
  - Email templates: `GET /admin/templates/email?include_deleted=1|true` returns `deleted_at`; `POST /admin/templates/email/:id/restore` clears `deleted_at`.
  - SMS templates: `GET /admin/templates/sms?include_deleted=1|true`; `POST /admin/templates/sms/:id/restore`.
  - Service configs: `GET /admin/services/configs?include_deleted=1|true`; `POST /admin/services/configs/:id/restore`.
  - Files: `apps/api/src/admin.controller.ts`.
- Web UI: toggles + restore buttons for Templates and Secrets.
  - Templates: `apps/web/app/admin/templates/{page.tsx,TemplateForms.tsx}`.
  - Secrets: `apps/web/app/admin/secrets/{page.tsx,SecretsForm.tsx}`.

## Auth: Password Reset
- Implemented email delivery for `POST /auth/request-reset` using SendGrid or SMTP when configured.
- Resolves `client_code` to org, then finds the user within that org via memberships to prevent cross-org leaks.

Update 2025-09-27 (Dev scripts: ngrok auto-start + checks)
- Startup: include ngrok in standard compose bring-up commands.
  - README quick start now adds `docker compose up -d ngrok` (after api/ai/web), and rebuild commands include `ngrok`.
  - AGENTS.md start-of-session flow updated to `docker compose up -d db && docker compose up -d --build api ai web ngrok`.
  - `scripts/db-reset.sh` brings up `ngrok` with core services.
- Monitoring: health/smoke/walkthrough scripts now monitor ngrok if running.
  - `scripts/health-check.sh`: verifies `localhost:4040/api/tunnels` exposes a `public_url` (retries 5x) and fails if ngrok is running but not ready.
  - `scripts/smoke-test.sh`: if ngrok is running, fetches `public_url` and hits `GET {public_url}/health` expecting `{ ok: true }`.
  - `scripts/walkthrough.sh`: prints detected ngrok public URL when available.
- Env: `.env.example` already includes `NGROK_AUTHTOKEN` and `NGROK_PUBLIC_URL` (unchanged).
- Files touched: `README.md`, `AGENTS.md`, `scripts/{health-check.sh,smoke-test.sh,walkthrough.sh,db-reset.sh}`.
- Production returns `{ ok: true }` only (non-enumerating); dev/non-production also returns `{ reset_token, expires }` to aid local testing.
- `POST /auth/reset` consumes token, updates password, and revokes refresh tokens.

## Templates Update
- New email template key: `password_reset` with `{{url}}`, `{{orgName}}`, `{{clientName}}`, `{{orgNameSuffix}}` variables. Defaults used if no template exists.
- Reset link targets `/reset?token=...` under `PUBLIC_BASE_URL` or `RESET_URL_BASE` if set.

Files touched
- API: `apps/api/src/auth.controller.ts`, `apps/api/src/mailer.ts` (added `sendPasswordResetEmail`).
- 030_user_profile.sql: adds user_profiles and user_preferences; links to users.
- API: new MeController with endpoints:
  - GET/POST /me/profile — upsert personal info (name, address, etc.).
  - GET/POST /me/preferences — theme (light/dark/system), color scheme (default, red, rose, orange, green, blue, yellow, violet), tz/language/notifications.
- Web: ThemeProvider applies theme + color scheme (html[data-color], dark class). New Settings page `/admin/settings` with Appearance and Profile sections. Admin sidebar gets a Settings link at bottom.
- Redesign plan: added `redesign.MD` documenting goals, scope, and rollout for the `design-2` branch.
Update 2025-09-17 (Web UX)
- Mobile navigation trigger updated: removed text "Menu" button in admin header.
- Added compact sidebar toggle icon (PanelLeft) next to filters in the header on mobile; opens the same Sheet-based nav.
- Desktop sidebar unchanged; mobile retains off‑canvas Sheet but with a modern icon button.
- Files: `apps/web/app/admin/layout.tsx`.
 - Root header now renders a static icon button plus a tiny inline script to attach behavior and toggle visibility on admin routes, avoiding dev HMR/client chunk issues.
Update 2025-09-17 (Email Templates)
- Added MJML/HTML support for email templates.
- DB: new migration `032_email_templates_mjml.sql` adds `body_html` and `body_mjml` to `email_templates`.
- API: `apps/api/src/admin.controller.ts` now accepts/returns `body_html`/`body_mjml` on email template endpoints; `apps/api/src/mailer.ts` sends HTML when available (still renders text fallback and variables).
- Web: Replaced email template textarea with GrapesJS + MJML editor and device preview (loads via CDN) with shadcn controls.
  - Files: `apps/web/components/admin/EmailMjmlEditor.tsx`, updated `apps/web/app/admin/templates/TemplateForms.tsx`.
- Admin requirements preserved: SPA POST via `/api/admin/proxy`, success/error toasts, RBAC remains enforced server-side.
- CSP: allowed `https://unpkg.com` for script/style in middleware to load editor assets.
 - Added Preview Send endpoint: `POST /admin/templates/email/preview` (RBAC-protected) to send a one-off preview email using SendGrid/SMTP config.
 - Editor now includes Editor/HTML/Text/Preview views and a "Send Preview" control that posts to the proxy.
Update 2025-09-19 (Agent Ops)
- AGENTS.md: added a session budgeting note — when ~5% of context remains, proactively complete in‑flight tasks and finalize (Brave Mode).
Update 2025-09-26 (Agents Orchestrator)
- Added a minimal multi-agent “roundtable” orchestrator that leverages OpenAI chat completions via the existing `ai` container.
- Files:
  - `apps/ai/app/assistants/orchestrator.py` (planner → implementer → reviewer flow)
  - `scripts/agents/run.sh` to invoke inside the `ai` service
  - `.env.example` adds `ASSISTANTS_MODEL` (defaults to `gpt-4o-mini`)
- Usage:
  - Set `OPENAI_API_KEY` in `.env` (or host env), then run:
    - `bash scripts/agents/run.sh "Generate a migration plan for billing orders"`
- Notes:
  - Network access and a valid OpenAI key are required to execute. In restricted environments, the script will exit with a missing-key or network error.

Update 2025-09-26 (Agents Queue + Worker)
- Added Redis-backed job queue and worker for assistants roundtable.
- Files:
  - `apps/ai/app/assistants/jobs.py` (enqueue, status get/set via Redis)
  - `apps/ai/app/assistants/worker.py` (BRPOP loop; runs orchestrator, stores results)
  - FastAPI endpoints in `apps/ai/app/main.py`:
    - `POST /agents/jobs` { task } → { job_id, status }
    - `GET /agents/jobs/{id}` → job status/result
  - Scripts:
    - `scripts/agents/worker.sh` to launch worker in `ai` container
- Env:
  - Uses `REDIS_URL` (defaults `redis://redis:6379/0`); `ASSISTANTS_MODEL` optional.
- Example:
  - Submit: `curl -sX POST localhost:8000/agents/jobs -H 'content-type: application/json' -d '{"task":"Draft billing ETL plan"}'`
  - Worker: `bash scripts/agents/worker.sh`
  - Fetch: `curl -s localhost:8000/agents/jobs/$JOB_ID`
  - List: `curl -s 'localhost:8000/agents/jobs?limit=20'`
- Retention: jobs stored with TTL `AGENTS_JOB_TTL` (default 24h) and auto-expire in Redis. Env can override.

Update 2025-09-26 (Usage Attribution & Tokens)
- DB: `036_usage_client_external.sql` adds `usage_events.client_id`, `external_id`, and `details` (JSONB) + indexes.
- API: `POST /usage/events` accepts `client_id`, `external_id`, `details`, and supports service-posts via `x-service-token` header when `SERVICE_TOKEN` is set. Service callers must include `org_id` in the body.
- AI: Orchestrator captures token usage per step (OpenAI usage with tiktoken fallback), aggregates totals, and worker posts completion usage events to API with context (org_id, client_id, project_code) using `SERVICE_TOKEN`.
- Web: `/api/agents/jobs` augments submission with `meta` from cookies (`orgFilter`, `clientFilter`, `projectCode`) so the worker can attribute usage correctly.
Update 2025-09-26 (Tasks Dashboard)
- Web: added Admin → Dashboard → Tasks with a table of recent agent jobs and quick counters by status.
  - `apps/web/app/admin/dashboard/tasks/page.tsx`
  - `apps/web/app/admin/dashboard/tasks/TasksTable.tsx`
  - Detail view: `apps/web/app/admin/dashboard/tasks/[id]/page.tsx`
- Web API proxies to AI service:
  - `GET/POST /api/agents/jobs`, `GET /api/agents/jobs/:id`, `POST /api/agents/jobs/:id/cancel`
- AI API: added cancel endpoint `POST /agents/jobs/{id}/cancel`.
- Menu: Admin sidebar Dashboard section includes “Tasks”.
- Update 2025-09-26 (Ops Policy)
- Requirement: Keep Terraform up to date. When features affect architecture (new services, workers, queues, caches, external DNS/SSL, IAM/IRSA roles, External Secrets), update `terraform/*.tf` (and related Helm/K8s manifests) as part of the change. Include a brief note in SUMMARY.MD describing the infra changes and any apply/runbook steps.
Update 2025-09-26 (PR Template + Pre‑merge Checklist)
- Added `.github/pull_request_template.md` with required checks (SUMMARY.MD updates, migrations, API/RBAC, UI, secrets, Infra/IaC, validation/tests).
- Added `docs/PRE_MERGE_CHECKLIST.md` as a more detailed pre‑merge guide.

Update 2025-09-26 (RPS → FastAPI Migration Tracker)
- Created master task doc: `docs/migrations/RPS_FASTAPI_MIGRATION.md` capturing scope, inputs, deliverables, phased plan, risks, and a running TODO.
- Process: queue sub‑tasks in the Portal Tasks dashboard using subject prefix "RPS→FastAPI" and include acceptance criteria; attribution set by header filters.

Update 2025-09-26 (Web UX — Tooltips)
- Replaced native title hints with shadcn Tooltip for accessibility and consistency.
- Added component: `apps/web/components/ui/tooltip.tsx`.
- Updated collapsed admin sidebar and admin header nav toggle to show Tooltips.
  - Files: `apps/web/app/admin/layout.tsx`, `apps/web/components/AdminNavToggleButton.tsx`.
- Tasks table now uses Tooltip to show full task text on hover instead of `title`.
  - File: `apps/web/app/admin/dashboard/tasks/TasksTable.tsx`.

Update 2025-09-27 (RPS → FastAPI: Skeleton Routers)
- Added initial FastAPI routers for RPS/Billing read endpoints in the `ai` service.
- Endpoints (JWT required; portal-manager bypass or perms `admin|manage_projects|view_usage`):
  - `GET /rps/orders` — list with `q`, `state`, `from`, `to`, `limit`, `offset`, `sort`, `dir`
  - `GET /rps/orders/{id}` — order detail with items, transactions, tracking, addresses, customer
  - `GET /rps/customers` — list with `q`, `from`, `to`, `limit`, `offset`, `sort`, `dir`
  - `GET /rps/transactions` — list with `q`, `processor`, `from`, `to`, `limit`, `offset`, `sort`, `dir`
- Files:
  - `apps/ai/app/rps/{__init__.py,models.py,router.py}`
  - `apps/ai/app/main.py` (includes router)
- Notes:
  - Uses existing Postgres billing schema (see `034_billing_core.sql`).
  - Org is enforced from JWT payload (`orgUUID`/`orgId`).
  - Next steps: add tests, CSV export options, and pagination metadata parity with Nest API.

Update 2025-09-27 (RPS Web Proxies + UI)
- Web API proxies to AI FastAPI for RPS endpoints with JWT forwarding + refresh on 401:
  - `app/api/rps/orders/route.ts`
 
Update 2025-09-27 (Tasks Dashboard Fix)
- Fixed runtime error on Admin → Dashboard → Tasks (`/admin/dashboard/tasks`) caused by invalid Select imports.
- Files touched:
  - `apps/web/app/admin/dashboard/tasks/TasksBoard.tsx` — switched to `rselect` primitives (`RSelect*`) and corrected usage.
- Validation:
  - Compiled route via web container: `wget http://localhost:3000/admin/dashboard/tasks` returned 307→200 (login), no runtime errors.

Update 2025-09-27 (DataTable Sorting Policy)
- Requirement: All admin data tables must provide sorting on all columns.
- Scope: Any usage of `components/ui/data-table` (and derivative table wrappers) must ensure every visible column is sortable via the header UI. Non-data utility columns (drag/select/actions) are exempt.
- Accessibility: Sorting affordance must be keyboard-accessible and announce current sort order.
- Process: Enforce during reviews; add to PR checklist. Existing tables should be aligned opportunistically or as part of adjacent work.

Update 2025-09-27 (DataTable Sorting — Default Enforcement)
- Implemented default sortable headers in `apps/web/components/ui/data-table.tsx`:
  - Header renders a clickable button when the column can sort, with ArrowUp/ArrowDown/ArrowUpDown indicators.
  - Added `defaultColumn: { enableSorting: true }` so columns are sortable unless explicitly disabled.
  - Added `aria-sort` on header cells for screen readers.
- Utility columns (drag/select/actions) remain `enableSorting: false` via helpers.

Update 2025-09-27 (Smoke Test — Tasks Page)
- scripts/smoke-test.sh: added compile check for `/admin/dashboard/tasks`.
- Manual validation inside `web` container confirms 200/302 for: `/admin`, `/admin/clients`, `/admin/projects`, `/admin/invites`, `/admin/dashboard/tasks`.
  - `app/api/rps/orders/[id]/route.ts`
  - `app/api/rps/customers/route.ts`
  - `app/api/rps/transactions/route.ts`
- Admin UI (experimental) under Dashboard → RPS (FastAPI):
  - `app/admin/dashboard/rps/{page.tsx,orders/page.tsx,customers/page.tsx,transactions/page.tsx}`
  - Orders page reuses existing `OrdersTable` for consistency; added “Download CSV” links.
- AI FastAPI RPS router: added `?format=csv` support for Orders/Customers/Transactions.
  - File: `apps/ai/app/rps/router.py`.

Update 2025-09-27 (RPS Orders Detail + Table)
- Web: added RPS Orders detail page and dedicated table component with correct routes.
  - `app/admin/dashboard/rps/orders/[id]/page.tsx`
  - `app/admin/dashboard/rps/orders/RpsOrdersTable.tsx`
  - Updated `app/admin/dashboard/rps/orders/page.tsx` to use RpsOrdersTable.
- Validation: health/smoke checks OK; pages redirect unauthenticated, compile successfully.

Update 2025-09-27 (Agents Tasks — RPS Planning)
- Queued and completed planning jobs via AI service:
  - "RPS→FastAPI: Domain Model Mapping" — done
  - "RPS→FastAPI: Routers/Services (read-only) for Orders/Customers/Transactions" — done
  - "RPS→FastAPI: ETL/Backfill Plan" — done (cleared OPENAI_PROJECT in env)
  - "RPS→FastAPI: Integrations (email/SMS/queue/cache)" — done
  - "RPS→FastAPI: Observability Plan" — done
- Worker: `scripts/agents/worker.sh` launches worker inside `ai`. OPENAI_API_KEY required.

Update 2025-09-27 (Automation)
- Added Brave Mode setup scripts for Jira and Confluence:
  - `scripts/jira-bootstrap.sh` creates/ensures group `avnz-app-team`, adds existing users by email (if found), and assigns common project roles in `AVNZ`.
  - `scripts/confluence-bootstrap.sh` creates/ensures Confluence space `AVNZ` (name: "Avnz App") and seeds a starter page tree (Team, Product, Development, QA, DevOps, Meetings).
- Environment: requires `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_DOMAIN` in `.env` or shell env. No secrets committed.
- Infra/API: no DB migrations or internal endpoints changed. Scripts use Atlassian Cloud REST APIs.
- Access: intended to run in Brave Mode without prompts; network access and Jira/Confluence admin scopes required.
- Jira script now attempts to create/invite missing users using Jira Cloud REST (`POST /rest/api/3/user`) with a best‑effort payload and then adds them to the `avnz-app-team` group; this requires site admin permissions and appropriate scopes. If creation is restricted by tenant policy, the script logs a warning and continues.
- Added helpers:
  - `scripts/jira-list-roles.sh` prints available project roles (name + URL) for a key (default `AVNZ`).
  - `scripts/jira-assign-roles.sh` reads `scripts/jira-roster.csv` (email,roleName[,displayName]), ensures users exist, and assigns them to the specified roles. Uses per-line assignment for compatibility with macOS bash.
  - `scripts/jira-roster.csv` seeded with the default roster mapping to `Administrators`, `Developers`, and `Viewers` — adjust role names to match your project via `jira-list-roles.sh`.

Update 2025-09-27 (Web — Admin Secrets fix)
- Fixed ReferenceError on `/admin/secrets` where `ActionButton` was used without import in the Secrets form component.
- Files: `apps/web/app/admin/secrets/SecretsForm.tsx` (added `import { ActionButton } from '@/components/admin/ActionButton'`).
- Behavior: Page now renders action buttons for Restore/Delete correctly on both table and mobile cards.

Update 2025-09-27 (Docs)
- BRAVE_MODE.md: added an explicit "Brave Mode: Allowed Actions" section clarifying that in Brave Mode it is permitted to run bash scripts, run Docker/Compose scripts and commands, run all necessary local commands, and change file permissions/ownership as needed, with safeguards for destructive actions. Aligns with AGENTS.md guidance.

Update 2025-09-27 (Web — RPS pages fetch fix)
- Fixed Unhandled Runtime Error on RPS dashboard pages due to server-side fetch using relative URLs.
- Added `apps/web/lib/url.ts` (`absoluteUrl(path)`) to construct absolute URLs from request headers.
- Updated pages to use absolute URLs:
  - `apps/web/app/admin/dashboard/rps/orders/page.tsx`
  - `apps/web/app/admin/dashboard/rps/orders/[id]/page.tsx`
  - `apps/web/app/admin/dashboard/rps/transactions/page.tsx`
  - `apps/web/app/admin/dashboard/rps/customers/page.tsx`
- No API changes or migrations; resolves "Failed to parse URL" in Node server runtime.
