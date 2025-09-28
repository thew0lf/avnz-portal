# avnz-portal — Full V3 (build 1757899728)

## Status
- Authoritative project brief and change log: see `SUMMARY.MD`.
- Pending work and options: see `TODOS.md` for a current, high-level checklist.
- Redesign track: see `redesign.MD` (branch: `design-2`).


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

# 3b) optional: expose API via ngrok for Slack/events/webhooks
# Set NGROK_AUTHTOKEN in .env first, then start ngrok (tunnels http://api:3001)
docker compose up -d ngrok

# 4) register, onboard, then sign in
# Visit the app, register your first org, complete the Onboarding wizard (optional provider secrets), then sign in
open http://localhost:3000
# After signing in, navigate to Admin → Pricing or open:
# http://localhost:3000/admin/pricing
```

## Requirements
- Docker Desktop installed and running (Docker Engine + docker compose v2).
- Internet access to pull base images on first run.
- Many commands and scripts in this repo invoke Docker (build/up/down/logs). Ensure Docker is started; we will run Docker commands when needed.
- Deletion policy: All deletes are soft-deletes. APIs should set `deleted_at` and readers must filter on `deleted_at IS NULL`.
- Build & checks: During updates, the agent may proactively rebuild Docker services and run health/smoke/walkthrough checks to validate changes.

Start-of-session checklist (Codex/agents)
- Review docs for context: read `SUMMARY.MD` end‑to‑end, skim `README.md`, `AGENTS.md`, `TODOS.md`, and `CHANGELOG.md` if present.
- Verify environment health:
  - `bash scripts/health-check.sh`
  - `bash scripts/smoke-test.sh`
  - `bash scripts/walkthrough.sh`
- Inspect recent logs for errors/warnings:
  - `docker compose ps`
  - `docker compose logs --since 15m api web`
- If issues arise, consider a local reset (confirm unless in Brave Mode):
  - `docker compose down -v --remove-orphans && docker system prune -af --volumes`
  - `docker compose up -d db && docker compose up -d --build api ai web ngrok`

Note: Brave Mode is the default in this repo. Agents run the above Docker and script commands automatically without asking. Destructive actions (like volume prune) are still called out explicitly unless the user has already consented within the session.

Git hooks (optional but recommended)
- Enable repo hooks once per clone:
  - `git config core.hooksPath .githooks`
- What they do:
  - `pre-commit`: runs lint; blocks committing `node_modules/`, `.next/`, and files > 50MB.
  - `pre-push`: blocks pushing if `HEAD` contains `node_modules/`, `.next/`, or files > 50MB.
  - These guardrails reinforce `.gitignore` and GitHub’s 100MB limit.

## Pre‑push Requirements
- You must run and pass all checks locally before pushing:
  - Lint: `bash scripts/lint.sh` (web/api ESLint)
  - Health test: `bash scripts/health-check.sh`
  - Smoke test: `bash scripts/smoke-test.sh`
  - Walkthrough (non-destructive): `bash scripts/walkthrough.sh`
- If any check fails, run a full reset and rebuild (see “Full Reset & Health Check”), fix issues, and retry.

## Full Reset & Health Check (Local)
If your database or migrations get out of sync, perform a clean reset and verify health.

Full reset
- Ensure Docker Desktop is running.
- From repo root:
  - Stop and remove containers/volumes: `docker compose down -v --remove-orphans`
  - Optional prune to reclaim space: `docker system prune -af --volumes`
  - Start DB first: `docker compose up -d db`
  - Rebuild and start services: `docker compose up -d --build api ai web ngrok`
- Shortcut: use `scripts/db-reset.sh` (interactive, destructive) to perform the above.

Re-run a specific migration (optional)
- To re-apply a fixed migration, delete its row from `schema_migrations` and restart API:
  - `docker compose exec -T db psql -U postgres -d avnzr_portal -c "delete from schema_migrations where filename='NNN_your_migration.sql';"`
  - `docker compose up -d api`
- The API logs show: `Applying migration NNN_*.sql` when it re-runs.

Health checks
- API health: `curl -fsS http://localhost:3001/health && echo 'API healthy'`
- Compose status: `docker compose ps` (api should report `healthy`).
- Logs: `docker compose logs -f api` (look for migration output and startup banner).

Notes
- API waits for healthy `db` and `redis` before starting; `web` waits for a healthy `api`.
- Migrations run on API startup; base bootstrap migrations are idempotent.

### Redis (optional, recommended)
Docker includes a `redis` service for rate limiting, caching, and session-like state. Services receive `REDIS_URL=redis://redis:6379`. The API falls back to in-memory if Redis is absent. For production, provision ElastiCache Redis (see `terraform/redis.tf`). A LocalStack service is also included to emulate select AWS services (ECR/IAM/STS) for local tests.

### Email delivery (queued)
Password reset and other transactional emails are enqueued to a DB outbox and processed by a worker to keep API requests fast and reliable. In local/dev, run the DB outbox worker; in production, enable SQS for decoupled processing.

- Local/dev: run the outbox worker from the API container (see `apps/api/src/workers/outbox-email.ts`).
- Production (recommended): set `SQS_QUEUE_URL` (and `AWS_REGION`) to publish jobs; deploy the SQS mailer worker (see `apps/api/src/workers/sqs-mailer.ts`, KEDA manifest in `argo/keda-mailer.yaml`).
- Templates and provider credentials are configured in the app (see sections below).

## AWS Deployment (Terraform) — EKS + Argo CD
- See `terraform/` for an EKS + Argo CD blueprint: VPC, EKS (managed node group), ALB + CloudFront + WAF, RDS Postgres (KMS), and ElastiCache Redis.
- Argo CD is installed via Helm and exposes a LoadBalancer Service; use it to manage app deployments (GitOps).
- Store secrets in AWS Secrets Manager or SSM (SecureString). App reads boot secrets from SSM; provider secrets remain in DB (encrypted with AES key from SSM).

High-level steps
1. `cd terraform && terraform init`
2. Copy and edit variables: `cp terraform.tfvars.example terraform.tfvars`, then set:
   - `project_name`, `region`, `domain_name`, `hosted_zone_id`, `acm_certificate_arn`
   - EKS sizing: `cluster_name`, `node_instance_types`, desired/min/max
   - Image refs: `api_image`, `web_image`, `ai_image`
   - SSM names: `ssm_auth_secret_name`, `ssm_db_url_name`, `ssm_app_aes_key_name`, and DB password name
3. `terraform apply`
4. Configure kubectl: `aws eks update-kubeconfig --name <cluster>`
5. Access Argo CD: `kubectl -n argocd port-forward svc/argocd-server 8080:443` or via the provisioned LoadBalancer hostname.
6. Apply Argo Applications (Helm GitOps):
   - Prod: `kubectl apply -n argocd -f argo/application-helm.yaml`
   - Staging: `kubectl apply -n argocd -f argo/application-helm-staging.yaml`
   - Update chart values in `charts/avnz-portal/values*.yaml` (namespace, domain, acmArn). CI updates image repo/tags automatically on push.

7. Bootstrap cluster controllers (recommended):
   - External Secrets Operator (ESO): `kubectl apply -n argocd -f argo/external-secrets.yaml`
     - Replace `REPLACE_ES_IRSA_ROLE_ARN` with the output `external_secrets_irsa_role_arn` from Terraform (IRSA role for ESO).
     - Configure ClusterSecretStores for AWS SSM/Secrets Manager and set Helm values (externalSecrets.*):
       - Apply stores via Argo: `kubectl apply -n argocd -f argo/eso-stores.yaml` (edit `k8s/eso/*` to set `REPLACE_AWS_REGION`).
       - Convenience: use `scripts/inject-arns.sh` to replace placeholders in Argo/ESO manifests:
         - `ES_IRSA_ARN=$(terraform output -raw external_secrets_irsa_role_arn) \
            DNS_IRSA_ARN=$(terraform output -raw external_dns_irsa_role_arn) \
            AWS_REGION=us-east-1 \
            PROD_DOMAIN=portal.example.com STAGING_DOMAIN=staging.portal.example.com \
            PRIVATE_DOMAIN=internal.example.com \
            bash scripts/inject-arns.sh`
       - Provided stores: `aws-ssm`, `aws-secretsmanager` (prod) and `aws-ssm-staging`, `aws-secretsmanager-staging` (staging).
       - In Helm values:
         - Prod: `charts/avnz-portal/values-prod.yaml` → `externalSecrets.clusterSecretStoreName: aws-ssm`, keys under `/avnzr/*`.
         - Staging: `charts/avnz-portal/values-staging.yaml` → `externalSecrets.clusterSecretStoreName: aws-ssm-staging`, keys under `/avnzr-staging/*`.
   - external-dns: `kubectl apply -n argocd -f argo/external-dns.yaml`
     - Replace `REPLACE_DNS_IRSA_ROLE_ARN` with the Terraform output `external_dns_irsa_role_arn`.
     - Replace `REPLACE_PROD_DOMAIN` and `REPLACE_STAGING_DOMAIN` with your domains to manage.
    - For internal ALB/NLB and private zones, use: `kubectl apply -n argocd -f argo/external-dns-internal.yaml` and set `REPLACE_PRIVATE_DOMAIN`.
   
8. DNS & TLS (Terraform toggles):
   - `use_cloudfront_prod` / `use_cloudfront_staging` control whether Route53 A/AAAA aliases point to CloudFront or directly to ALB.
   - Terraform provisions ACM (us-east-1) and validation records when using CloudFront.

### Helm chart options
- Exposure (values.yaml):
  - `exposure.type: ingress` uses AWS ALB Ingress Controller with path-based routing (/api, /ai, /).
  - `exposure.type: nlb-web` creates an NLB Service exposing only `web` on port 80 (no path-based routing; `web` must call `api/ai` internally).
- Ingress scheme: `ingress.scheme: internet-facing` or `internal`.
- ExternalDNS support: set `externalDNS.enabled: true` and `externalDNS.hostname` to let external-dns manage Route53 records.
- External Secrets:
  - Enable syncing from AWS SSM/Secrets Manager via External Secrets Operator: `externalSecrets.enabled: true`.
  - Provide `externalSecrets.clusterSecretStoreName` (and `storeKind`) referencing a pre-configured ClusterSecretStore, or set `externalSecrets.store: secretsmanager` to auto-select a store name if not provided.
  - Map keys under `externalSecrets.data` to populate the in-cluster `app-secrets` Secret (DATABASE_URL, AUTH_SECRET, APP_AES_KEY).

### Internal-only deployment
- Use the internal Argo Application: `kubectl apply -n argocd -f argo/application-helm-internal.yaml`.
- This uses `charts/avnz-portal/values-internal.yaml`:
  - `exposure.type: nlb-web` for an NLB Service (no ALB/CloudFront needed).
  - Optionally enable `externalDNS.enabled` for a private Route53 zone (see `argo/external-dns-internal.yaml`).
  - External Secrets may reference `/avnzr-internal/*` SSM keys if desired.
7. Update placeholders in `k8s/` manifests:
   - Replace `REPLACE_WITH_ECR` image registry, `REPLACE_WITH_DOMAIN`, and `REPLACE_WITH_ACM_ARN` in Ingress.
   - Create secrets: `kubectl apply -f k8s/secrets.example.yaml` (use real values).
8. The AWS Load Balancer Controller provisions an ALB from `k8s/ingress.yaml` for `/`, `/api`, and `/ai` paths.
9. To target staging vs prod, the CI updates image tags in `k8s/overlays/staging` and `k8s/overlays/prod`. You can also manually override tags/registries in the overlay kustomization files.

### LocalStack (optional)
- Start LocalStack alongside dev services: `docker compose up -d localstack`
- Provision minimal ECR repos to validate pushes:
  - `cd terraform/localstack && terraform init && terraform apply -var project_name=avnzr-local -var region=us-east-1`
- Seed LocalStack ECR with dummy images:
  - `bash scripts/seed-localstack-ecr.sh` (requires Docker and AWS CLI; uses endpoint http://localhost:4566)
- Note: Full infra (EKS/ALB/CloudFront/WAF/RDS/ElastiCache) is not supported in LocalStack; use real AWS for those.

Notes
- The repo still contains an ECS Fargate skeleton for reference; the recommended path is EKS + Argo CD for GitOps.

## Contributor Guide

Before making changes, read the following:

- `AGENTS.md` — Agent/contributor guide for how to work in this repo (security conventions, migrations, RBAC, UI patterns).
- `SUMMARY.MD` — The authoritative, always-up-to-date project brief and change log. After any substantive change, append a concise summary of what changed, files touched, endpoints/migrations added, and configuration/secret expectations.
 - PR Template — A checklist is enforced via `.github/pull_request_template.md`. See `docs/PRE_MERGE_CHECKLIST.md` for a detailed pre‑merge checklist (migrations, API/RBAC, UI patterns, secrets, and keeping Terraform/Helm/K8s up to date when architecture changes).

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

Initial users are created when an organization is registered. Use the Register flow (`/register/org`) to create the first org and admin account locally.

Routes:
- API: `POST /auth/login` → returns `{ token, refresh_token }`
- API: `POST /auth/refresh` → returns new `{ token }`
- API: `POST /auth/request-reset` and `POST /auth/reset` (dev: reset token returned in response)

### Twilio SMS (optional)
The API can send SMS invitations via Twilio when a contact includes a phone number.

Secrets for providers are stored in the database (encrypted) and managed in the Admin UI at `/admin/secrets`. Environment variables are optional for local development and overrides; production should use DB-backed secrets.

Environment variables:
- `TWILIO_ACCOUNT_SID` — Your Twilio Account SID (e.g., ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
- `TWILIO_AUTH_TOKEN` — Your Twilio Auth Token
- `TWILIO_FROM` — The Twilio phone number to send from (E.164, e.g., +15555551234)
- `INVITE_ACCEPT_URL_BASE` — Base URL for invite acceptance links (defaults to `PUBLIC_BASE_URL` or `http://localhost:3000/accept`)

With these set, `apps/api/src/sms.ts` will send SMS invites. If unset, the API logs a warning and skips SMS.

### SendGrid Email (optional)
Email sending prefers SendGrid’s API when configured, with SMTP as a fallback.

Secrets for providers are stored in the database (encrypted) and managed in the Admin UI at `/admin/secrets`. Environment variables are optional for local development and overrides; production should use DB-backed secrets.

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
- Default templates are seeded for the `invite` and `password_reset` keys and can be overridden per client.
- Supported variables in templates:
  - `{{url}}` — Acceptance link
  - `{{clientName}}` — Client display name
  - `{{orgName}}` — Organization name
  - `{{orgNameSuffix}}` — Auto-built suffix like ` on {{orgName}}`
  - `{{shortCode}}` — Client short code (SMS)

Notes: Messages are not hard-coded; they are loaded from the DB at runtime. If a client-specific template exists for a key, it will be used; otherwise the default template is used.
