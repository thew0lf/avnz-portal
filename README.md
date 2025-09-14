# avnzr-portal — Full V3 (build 1757378394)

**Stacks**
- **DB:** Postgres 15 + pgvector
- **API:** NestJS (TypeScript, ESM, Node16 resolution)
- **AI:** FastAPI (Python 3.11) — ingestion, redaction, chunking, embeddings (OpenAI/Bedrock), vector search
- **Web:** Next.js 14 (App Router) + Tailwind + shadcn-style UI components
- **Compliance:** audit log, soft deletes, CSV exports, redaction metrics
- **Pricing:** flexible rules (default/org/role/user), simulator endpoint & admin UI
- **Usage:** per-provider/model token accounting (input/output/embed) and costs
- **Security:** PII redaction pipeline (email/phone/SSN/CC), role-gated admin (client → company → dept → team → optional group → user model is supported logically via orgId/userId/roles headers)
- **VC-friendly presets:** Project settings lock Bedrock + pgvector, SOC2/ISO patterns

## Quick start
```bash
# 1) copy env
cp .env.example .env

# 2) start db
docker compose up -d db

# 3) run services
docker compose up -d --build api ai web

# 4) admin
open http://localhost:3000/admin/pricing
```

## Contributor Guide

Before making changes, read the following:

- `AGENTS.md` — Agent/contributor guide for how to work in this repo (security conventions, migrations, RBAC, UI patterns).
- `SUMMARY.MD` — The authoritative, always-up-to-date project brief and change log. After any substantive change, append a concise summary of what changed, files touched, endpoints/migrations added, and configuration/secret expectations.

## Mobile-Friendly Requirement (Required)

All pages must be mobile friendly. Follow these instructions:

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

### Authentication & Multi-Tenancy
- Strict model: Organizations (company) → Clients (child of org) → Projects (child of org, optional client).
- Users are global; access granted via Memberships (user ↔ org with role) and optional Project Members.
- Domain tables carry `org_id` (UUID → organizations.id) and optional `project_id` (UUID).

Login (three-tier)
- Requires: client code + username/email + password.
- Token-only auth with HMAC-signed access tokens and refresh tokens.
- Web stores HttpOnly `session` (access token) and `refresh_token` cookies.
- API validates `Authorization: Bearer …` and sets `req.auth` with user/org/project context.
- AI requires the same token; derives org/user from it.

Dev users are seeded from `DEMO_USERS` during migration, and default client `demo` is created.

Routes:
- API: `POST /auth/login` → returns `{ token, refresh_token }`
- API: `POST /auth/refresh` → returns new `{ token }`
- API: `POST /auth/request-reset` and `POST /auth/reset` (dev: reset token returned in response)

### Twilio SMS (optional)
The API can send SMS invitations via Twilio when a contact includes a phone number.

Environment variables:
- `TWILIO_ACCOUNT_SID` — Your Twilio Account SID (e.g., ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
- `TWILIO_AUTH_TOKEN` — Your Twilio Auth Token
- `TWILIO_FROM` — The Twilio phone number to send from (E.164, e.g., +15555551234)
- `INVITE_ACCEPT_URL_BASE` — Base URL for invite acceptance links (defaults to `PUBLIC_BASE_URL` or `http://localhost:3000/accept`)

With these set, `apps/api/src/sms.ts` will send SMS invites. If unset, the API logs a warning and skips SMS.

### SendGrid Email (optional)
Email sending prefers SendGrid’s API when configured, with SMTP as a fallback.

- API mode (preferred):
  - `SENDGRID_API_KEY` — Your SendGrid API Key
  - `SENDGRID_FROM` — Default From address (or set `SMTP_FROM`)
  - Install dependency in API service: `@sendgrid/mail`

Fallback SMTP mode:
  - If `SMTP_HOST`/`SMTP_PORT` are provided, the API will use Nodemailer SMTP.
  - If `SMTP_HOST`/`SMTP_PORT` are not set but `SENDGRID_API_KEY` is present, it will use SendGrid’s SMTP bridge with:
    - host `smtp.sendgrid.net`, port `587`, user `apikey`, pass `SENDGRID_API_KEY`
You can set `SMTP_FROM` or `SENDGRID_FROM` to control the From address.

### Template Management
Email and SMS message content is stored in the database and can be managed in the web UI at `/admin/templates`.

- Tables: `email_templates` (key, subject, body, optional client_id) and `sms_templates` (key, body, optional client_id).
- Default templates are seeded for the `invite` key and can be overridden per client.
- Supported variables in templates:
  - `{{url}}` — Acceptance link
  - `{{clientName}}` — Client display name
  - `{{orgName}}` — Organization name
  - `{{orgNameSuffix}}` — Auto-built suffix like ` on {{orgName}}`
  - `{{shortCode}}` — Client short code (SMS)

Notes: Messages are not hard-coded; they are loaded from the DB at runtime. If a client-specific template exists for a key, it will be used; otherwise the default template is used.
