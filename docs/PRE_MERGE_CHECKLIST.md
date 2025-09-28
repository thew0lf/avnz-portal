Pre‑Merge Checklist
===================

Use this list to verify changes before opening a PR or merging:

1) Summary & Docs
- Update `SUMMARY.MD` (features, files, endpoints, env/secrets, migrations, UI routes, infra notes).
- Note any operational steps (migrations, Terraform apply, Helm changes).

2) Schema & Data
- New migrations in `db/init/NNN_*.sql` (idempotent when possible).
- Soft-delete policy respected; readers filter `deleted_at is null`.

3) API & RBAC
- Endpoints under `apps/api/src`; guards/route registry updated if required.
- Non-enumerating auth flows; CSP/headers preserved.

4) Web
- SPA forms + toasts; mobile-friendly; client/server boundaries correct.
- Avoid importing client-only components into server routes/pages.

5) Secrets & Config
- No hard-coded secrets; use DB `service_configs` or ESO; update .env.example when needed.

6) Infra / IaC
- Terraform/Helm/K8s updated if architecture changed (new queues, workers, caches, DNS, IAM/IRSA, External Secrets).
- Provide Terraform plan/apply notes for reviewers.

7) Validation
- Lint: `bash scripts/lint.sh`.
- Health: `bash scripts/health-check.sh`.
- Smoke: `bash scripts/smoke-test.sh`.
- Walkthrough: `bash scripts/walkthrough.sh`.

8) Tests
- Add/adjust unit/integration tests where appropriate.

