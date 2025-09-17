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

## Auth: Password Reset
- Implemented email delivery for `POST /auth/request-reset` using SendGrid or SMTP when configured.
- Resolves `client_code` to org, then finds the user within that org via memberships to prevent cross-org leaks.
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
