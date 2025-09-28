## Summary

Describe the change and why it’s needed. Link issues if applicable.

## Checklist (Required)

- [ ] Updated `SUMMARY.MD` with: features, files touched, endpoints, env/secrets, migrations, UI routes/access, and infra/IaC updates.
- [ ] Database migrations added under `db/init/NNN_*.sql` (idempotent where practical).
- [ ] API contracts: request/response documented; RBAC/route registry updated if applicable.
- [ ] Web UI: SPA forms/toasts; pages mobile-friendly; server/client boundaries respected.
- [ ] Web UI: DataTables provide sorting for all data columns (utility columns like drag/select/actions exempt); headers are keyboard-accessible.
- [ ] Secrets: stored via service_configs or external secrets (no hard-coded secrets).
- [ ] Infra/IaC: Terraform/Helm/K8s updated if architecture changed (queues, workers, caches, DNS, IAM/IRSA, External Secrets). Applied/tested in appropriate envs.
- [ ] Scripts/Runbooks: health/smoke/walkthrough run locally and pass; add runbook notes if manual steps exist.
- [ ] Tests/Lint: linters pass; added/updated tests where appropriate.

## Validation

Provide notes/screenshots/logs showing:
- Health/smoke/walkthrough outputs
- Relevant API/web screenshots or curl responses
- Infra changes applied (Terraform plan/apply snippet), if applicable

## Risks & Rollback

Call out risks, feature flags, and how to roll back.
