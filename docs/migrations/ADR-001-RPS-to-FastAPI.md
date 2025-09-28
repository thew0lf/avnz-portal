# ADR-001: RPS → FastAPI (Discovery & Decision)

Status: Accepted
Date: 2025-09-27
Owner: Platform / API team

## Context
We are porting external/crm-portal/vendor/RPS to a FastAPI-based package integrated with the portal (JWT/RBAC, org/client/project attribution, usage/cost tracking). This ADR documents the initial discovery output and the decision to proceed with a phased plan.

## Discovery Output (Assistant)

### Plan
1. Identify Requirements: Gather functional and non-functional requirements for the FastAPI application from stakeholders.
2. Research FastAPI Features: Explore FastAPI documentation and community resources to understand its capabilities and best practices.
3. Analyze Current RPS: Review the existing RPS architecture and identify components that need to be migrated or re-implemented.
4. Draft ADR: Create an Architecture Decision Record (ADR) outlining the rationale for choosing FastAPI, including pros and cons.
5. Review with Team: Present findings and ADR to the development team for feedback and consensus.
6. Finalize Documentation: Incorporate feedback and finalize the discovery document and ADR.

Assumptions: Stakeholders are available; the team is familiarizing with FastAPI.
Risks: Resistance to change; potential gaps in FastAPI knowledge.

### Implementation Guidance
- Stakeholder Discovery: Schedule interviews; centralize requirements in shared docs.
- FastAPI Review: Study official docs (DI, async, OpenAPI); review community patterns.
- RPS Analysis: Inventory modules and data flows; mark migration candidates.
- ADR Drafting: Create `docs/migrations/ADR-001-RPS-to-FastAPI.md` with rationale, pros/cons.
- Team Review: Walkthrough ADR; capture feedback; update.
- Finalize: Store discovery artifacts under `docs/migrations/`.

### Review Notes
- Risks: Stakeholder availability; uneven FastAPI familiarity.
- Gaps: Per-phase timeline and acceptance tests not yet defined.
- Improvements: Add milestone timeline and initial test cases per component.

### Usage (Tokens)
- Provider: openai
- Model: gpt-4o-mini
- Input tokens: 921
- Output tokens: 643
- Steps: planner (in 77, out 176), implementer (in 255, out 342), reviewer (in 589, out 125)

## Decision
Proceed with phased migration to a FastAPI package with:
- Pydantic/SQLAlchemy domain modeling (Motor only if dual-read becomes necessary).
- JWT/RBAC aligned with portal; org/client/project attribution flows through.
- Idempotent mutations and background jobs (outbox pattern preferred).
- Observability (structured logs, metrics, tracing) and rate limiting.
- Migration strategy including ETL/backfill, optional dual-read, shadow testing, staged cutover.

## Consequences
- Training: Team upskilling on FastAPI.
- Infra: Ensure Redis (queues) and SQS or equivalent are available.
- Security: Align secrets/config with External Secrets and portal conventions.

## Next Steps (Sub‑Tasks)
1) Discovery & ADR (this ADR) — complete.
2) Domain Model Mapping — ODM → SQLAlchemy/Pydantic; schema migrations.
3) Phase 1 Services & Routers — Orders, Customers, Transactions (read/list/detail) with RBAC and tests.
4) Integrations — SendGrid/Twilio, Redis/SQS, crypto; background workers.
5) ETL & Cutover Plan — backfill, shadow tests, rollback/runbooks.
6) Hardening — load tests, SLOs, dashboards.

## Open Questions
- Confirm provider pricing/tokenization rules across models used.
- Clarify RBAC mapping for API endpoints relative to portal roles.

