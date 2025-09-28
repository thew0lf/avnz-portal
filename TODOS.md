# Pending Options / TODOs

Status source of truth remains `SUMMARY.MD`. This list tracks near-term implementation tasks and options. Do not add secrets here; manage provider creds in DB via `/admin/secrets`.

General
- [ ] Verify all new DB migrations are idempotent and ordered under `db/init` with next numeric prefix.
- [ ] Add minimal unit/integration tests for pricing and usage events (rule resolution, cost_usd computation).
- [ ] Replace local outbox worker with SQS + KEDA (or Lambda) in production; keep `outbox_emails` as the outbox and idempotency source of truth.

API (NestJS)
- [ ] Confirm `/usage/timeseries` and `/usage/summary` support filters: `from`, `to`, `projectCode`, `clientId`, `userId`, `interval`.
- [ ] Wire Redis rate limiting when `REDIS_URL` is present (fallback to in-memory confirmed).
- [ ] Ensure RBAC decorators are present on new/updated admin endpoints (use `@Authz({ action, domain: 'node', resourceType: 'org', resourceParam: 'nodeId' })`).
- [ ] Implement SQS publisher and replace direct DB polling worker; add DLQ and backoff config.

Web (Next.js App Router)
- [ ] Ensure all admin forms use SPA pattern (React Hook Form + Zod) with toasts on success/error.
- [ ] Confirm all tables/pages have moved to shadcn primitives for consistency.
- [ ] Persist and read project/client/user filters via cookies and localStorage as documented.
- [ ] Replace native title hints with shadcn/ui Tooltip or Popover across Dashboard and Tasks controls (range toggles, series toggles, help). Add accessible labels and keyboard shortcut summaries.
- [ ] Align Tasks dashboard `/admin/dashboard/tasks` to match `/admin/clients` visual scaffolding (container, cards, headings, DataTable styling, spacing) and responsive behavior.

Templates & Messaging
- [ ] Validate template rendering variable coverage: `url`, `clientName`, `orgName`, `orgNameSuffix`, `shortCode`.
- [ ] Confirm SendGrid/Twilio send flows record `usage_events` with cost attribution.
- [ ] Seed default email templates for `invite` and `password_reset` in `028_default_email_templates.sql` (verify applied).

Secrets & Config
- [ ] Use `service_configs` for provider secrets (no hard-coded secrets). Verify `getServiceConfig()` override → default resolution.
- [ ] Test `/admin/secrets` UI and `GET/POST/DELETE /admin/services/configs` for org-scope RBAC.

Ops (Terraform, Argo, ESO)
- [ ] Replace IRSA and domain placeholders in Argo/ESO manifests (use `scripts/inject-arns.sh`).
- [ ] Set `externalSecrets.clusterSecretStoreName` in Helm values per environment.
- [ ] Verify CI/CD updates image tags and Argo syncs to cluster.
- [ ] Add Terraform for SQS queues (main + DLQ) and KEDA ScaledObject; or SQS→Lambda with reserved concurrency and retry policy.
- [ ] Dashboards/alerts for outbox lag, DLQ count, send failures.
- [ ] Keep Terraform up to date whenever features change architecture (new services/queues/caches/roles/secrets/DNS); add/update modules and document apply steps.

Security & Compliance
- [ ] Confirm forgot-password remains non-enumerating and redirects with neutral toast.
- [ ] Review prod CSP and headers; dev retains HMR allowances only.
