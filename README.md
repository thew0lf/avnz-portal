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
