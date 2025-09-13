# Avnz Multi‑Tenant Auth & RBAC Spec (SOC 2 / ISO 27001–aligned)

> **Audience:** Codex CLI / implementation agents  
> **Goal:** Implement a secure, dynamic, multi‑tenant authentication, registration, and RBAC system (no static org data) with client short codes, email/SMS invitations (Twilio), route‑level permissions, and strong auditability.

---

## 1) Design Goals & Constraints

- **No default org shipped.** On first‑run, the **bootstrap flow** creates the **first Org** and its **OrgOwner**. Subsequent users/orgs are created via UI/API only.
- **Single client short code per client**, generated uniquely on creation (immutable). Everyone under the client logs in with that code + username + password/SSO. **No short code field on the client registration form**; it’s created server‑side.
- **Dynamic (non‑static) roles & permissions.** Role definitions are seeded as *definitions* but assignments are stored per tenant in DB. No hard‑coded users or orgs.
- **Least privilege by default.** New users have 0 access until explicitly added and assigned a role.
- **Visibility by role.** Only OrgRoles can access **Org‑level features**. Lower levels cannot see or access Org features unless they also hold an Org‑level role.
- **Route‑level enforcement (server) + UI hiding (client).** Removing a route permission removes access and also hides buttons/menu items/dropdowns in the UI.
- **SOC 2 / ISO 27001 alignment.** Full audit trails, secure key/secrets mgmt, encryption in transit/at rest, access reviews, change mgmt, vendor risk, and data retention.
- **SMS + Email invitations.** Invites can be sent via either channel, used interchangeably, and require a contact (email or phone; either is sufficient).
- **Multi‑factor auth (MFA) optional → recommended default.**
- **SSO ready.** OIDC/SAML pluggable at Org or Client level.

---

## 2) Entity Model & Hierarchy

```
Org
└── Client (1:N)
    └── Company (1:N)
        └── Department (1:N)
            └── Team (1:N)
                └── Group (1:N)
                    └── Users (N:M with roles at each level)
```

### Required Roles (inherit downward within the same tenant branch)
- **Org:** `OrgOwner`, `OrgAdmin`, `OrgAccountManager`, `OrgStaff`, `OrgEmployee`
- **Client:** `ClientOwner`, `ClientAdmin`, `ClientAuditor`, `ClientStaff`, `ClientEmployee`
- **Company:** `CompanyAdmin`, `CompanyManager`, `CompanyAuditor`
- **Department:** `DepartmentAdmin` *(Principal)*, `DepartmentManager`, `DepartmentAuditor`
- **Team:** `TeamOwner` *(Lead Teacher)*, `TeamManager` *(Co‑Teacher)*, `TeamContributor` *(TA/Student Helper)*, `TeamViewer`
- **Group:** `GroupLeader`, `GroupContributor`, `GroupViewer`

> **Note:** Students are typically `TeamContributor` in their class and `GroupContributor` (or `GroupLeader`) in their lab group.

**Inheritance rule:** A role at a *higher level* implicitly grants “view and administer children” *only if* the permission is present in the role’s policy (explicit allow). Keep inheritance explicit to preserve least‑privilege and easy audits.

---

## 3) Registration & First‑Run Bootstrapping

### 3.1 First‑Run (No Orgs Exist)
1. Accessing `/register` renders **Org Registration** form (no existing orgs):  
   - Inputs: Org name, billing email, admin email/phone, password, MFA preference, compliance consent.
   - Output: Create `Org` and initial `User` with `OrgOwner` at that Org.
2. After success, redirect to **Client Registration** for this Org.

### 3.2 Client Registration (Org exists)
- Render **Client Registration** form **without a short code field**.  
- Server generates **unique `client_short_code`** (e.g., `A1B2C3`) on create.  
- The creating user becomes `ClientOwner` for that Client (scoped to the newly created Client).  
- Optionally chain to Company/Department/Team/Group creation wizards.

### 3.3 User Invitations (Email/SMS)
- Client (or higher) admins can invite users:
  - **Delivery:** email (SMTP provider) or SMS (Twilio) — either/both.
  - **Payload:** signed, single‑use invite token + URL to client‑specific registration page:  
    `/invite/{client_short_code}/{token}`
  - **At registration:** user must provide *at least one* of {email, phone}. Either is sufficient.
  - Client can assign a role (e.g., `TeamContributor`) in the invite or on approval.
  - Tokens expire (e.g., 72h) and are auditable.

### 3.4 Login
- **Tenant selector**: users enter `client_short_code`, `username`, `password` (or federated SSO).  
- Throttling, IP rate‑limits, device fingerprinting, optional WebAuthn/MFA.
- Post‑auth, role discovery loads **route permissions** and **UI capabilities** dynamically.

---

## 4) Authentication & Authorization

### 4.1 Identity & Credentials
- Username scoped by `client_short_code`. Global uniqueness not required.
- Passwords: Argon2id with strong parameters; rotation + strength policy enforced.
- Optionally store **email** and **phone** as verified contact methods (TOTP/SMS/Email for MFA).

### 4.2 Authorization Model
- **Policy objects:** `roles`, `permissions`, `routes`, `actions` (CRUD, Approve, Invite, Configure, etc.).
- **Grants:** `role_assignment(user_id, scope_type, scope_id, role_id)` (scope_type ∈ {Org, Client, Company, Department, Team, Group}).
- **Route registry:** `/api/routes` canonical list with `capability_keys` (e.g., `client.user.invite`, `team.file.upload`).  
- **Role→Route mapping:** `role_route_permission(role_id, route_id, actions[])`.
- **UI capability map:** client app hides menus/buttons when no `can(action, capability_key)`.

> **Server is source of truth.** UI hiding is *in addition to* server enforcement.

### 4.3 Permission Inheritance
- Implement **explicit** inheritance via DB view or service that rolls up parent grants *only for actions marked inheritable*. Example: `ClientAdmin` may inherit `view` on all child Companies/Departments/Teams but not `approve` unless explicitly granted.

---

## 5) Route Guarding & UI Hiding

- **Server middleware** reads user grants and checks `action` against route’s `capability_key` (RBAC policy). Deny → 403 + audit.
- **Client capability provider** receives a signed capability payload after login/refresh; UI consumes `has('client.user.invite:write')` to enable buttons.
- **Removing a permission**:
  - Immediately blocks server routes.
  - Next capability refresh hides UI elements (menus, buttons, dropdown items).

---

## 6) Data Model (PostgreSQL)

> Use UUID PKs. All rows include: `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` (soft delete).

- `orgs(id, name, billing_email, …)`
- `clients(id, org_id FK, name, client_short_code UNIQUE, …)`
- `companies(id, client_id FK, name, …)`
- `departments(id, company_id FK, name, …)`
- `teams(id, department_id FK, name, …)`
- `groups(id, team_id FK, name, …)`
- `users(id, org_id FK, primary_email, primary_phone, username, password_hash, mfa_enrolled, …)`
- `login_identifiers(id, user_id FK, type ENUM(email|phone), value, verified_at)`
- `roles(id, level ENUM(org|client|company|department|team|group), name, description, inheritable_jsonb)`
- `role_assignments(id, user_id FK, scope_type, scope_id, role_id, granted_by, granted_at)`
- `routes(id, method, path, capability_key, description)`
- `role_route_permissions(id, role_id FK, route_id FK, actions JSONB)`
- `invitations(id, client_id FK, email, phone, role_id, token_hash, expires_at, accepted_at, sent_via ENUM(email|sms|both))`
- `audit_logs(id, actor_user_id, event_type, entity_type, entity_id, metadata JSONB, ip, user_agent, at)`
- `consents(id, user_id, type, text_hash, accepted_at)`
- `service_integrations(id, org_id, provider ENUM(twilio|smtp|oidc|saml), config_secret_ref)`
- `secrets(id, owner_type, owner_id, key, ref(vault path))`

**Indexes:** enforce tenant isolation and speed (e.g., `(client_short_code)`, `(scope_type,scope_id)`, `(capability_key)`).  
**RLS (Row‑Level Security):** enable on all multi‑tenant tables to prevent cross‑tenant reads/writes.

---

## 7) Twilio & Email (Invites + Notifications)

### 7.1 Twilio (SMS)
- Store Twilio creds in a **secrets manager** (e.g., AWS Secrets Manager/HashiCorp Vault).  
- API usage:
  - **Send invite SMS** with short, signed URL (`/invite/{client_short_code}/{token}`).
  - **OTP codes** for optional SMS MFA with replay protection and throttling.
- Logging: message SID, to/from, status, redaction of content in logs.

### 7.2 Email
- Use provider‑agnostic interface (SES, SendGrid, Postmark, etc.).  
- DMARC/DKIM/SPF configured; suppress lists honored.

---

## 8) Compliance (SOC 2 / ISO 27001 alignment)

- **Access Control:** least privilege; quarterly **access reviews**; break‑glass accounts audited.
- **Audit Logging:** immutable logs for auth, invites, role changes, permission edits, failed access, route denials; retained ≥ 1 year (configurable).
- **Encryption:** TLS 1.2+ in transit; AES‑256 at rest; keys rotated; KMS/CloudHSM managed.
- **Secrets Mgmt:** never in code/env files in plain text; use secrets manager; rotate Twilio/API keys.
- **Change Mgmt:** PRs, code review, CI checks (SAST/DAST/dep scans), versioned migrations.
- **Vendor Mgmt:** Twilio/email vendors assessed; DPAs on file; data minimization.
- **PII/Privacy:** limit data collection; field‑level encryption for phone/email optional.
- **Backups/DR:** daily encrypted backups; tested restores; RPO/RTO documented.
- **Incident Response:** alerting (SIEM), on‑call runbooks, breach notification workflow.
- **Data Retention:** invites auto‑purge after expiry; logs per policy; user deletion workflows.
- **Monitoring:** rate limiting, IP throttling, captcha after threshold, anomaly detection.

---

## 9) API Surface (Illustrative)

```http
POST /api/bootstrap/org                # first-run only
POST /api/clients                      # create client (no short code in payload)
GET  /api/clients/:id                  # returns client_short_code
POST /api/invitations                  # {client_id, email|phone, role_id}
POST /api/register/:short/:token       # complete invited user registration
POST /api/login                        # {short_code, username, password} → tokens + capability map
GET  /api/capabilities/me              # UI pulls current capabilities
POST /api/roles/assign                 # grant role at scope
DELETE /api/roles/assign/:id           # revoke
GET  /api/routes                       # registry for admin interface
POST /api/permissions/role-route       # modify role→route actions (audit this)
```

**Actions**: `read`, `create`, `update`, `delete`, `invite`, `approve`, `configure` (extensible).

---

## 10) Admin UX Requirements

- **Org‑only features** visible exclusively to `Org*` roles.
- **Permission Editor:** grid of `role × capability_key` with action toggles; changes are versioned and audited.
- **Route Explorer:** searchable list of server routes → capability keys → affected UI components.
- **What‑If Checker:** simulate a user to preview what they can see/do across the hierarchy.
- **Invite Console:** send/cancel/resend; see delivery status (email/SMS).
- **Access Review:** exportable CSV/PDF of role assignments by scope; certify/revoke in bulk.

---

## 11) Security Controls (Engineering Checklist)

- [ ] Argon2id passwords with strong params; deny common passwords.
- [ ] JWT (short‑lived) + refresh tokens; rotate on privilege change; device binding optional.
- [ ] CSRF, XSS, SSRF, OAuth best practices; strict Content‑Security‑Policy.
- [ ] Rate limits on auth/invite/OTP; lockout with exponential backoff.
- [ ] RLS enforced in DB; service‑side tenant checks on every request.
- [ ] Structured audit logs → centralized store (e.g., CloudWatch/ELK) with immutability.
- [ ] Secrets from vault; no plaintext `.env` for prod; CI uses OIDC to fetch secrets.
- [ ] IaC with least‑privilege roles; narrow SGs; VPC endpoints for email/SMS if applicable.
- [ ] Third‑party SDKs pinned and verified; supply‑chain scanning enabled.
- [ ] Automated tests: unit, integration, e2e for auth/RBAC; policy snapshot tests for routes.

---

## 12) Example Payloads

**Create Client (server assigns short code)**
```json
POST /api/clients
{ "orgId": "…", "name": "Client A" }
→ { "id": "…", "name": "Client A", "clientShortCode": "H7K2QX" }
```

**Invite User (email or phone; either is valid)**
```json
POST /api/invitations
{
  "clientId": "…",
  "contact": { "email": "new.user@example.com" },
  "roleId": "TeamContributor",
  "expiresInHours": 72
}
```

**Login**
```json
POST /api/login
{ "shortCode": "H7K2QX", "username": "jdoe", "password": "••••••••" }
→ { "accessToken": "…", "refreshToken": "…", "capabilities": [{ "key": "client.user.invite", "actions": ["create"] }, …] }
```

---

## 13) Implementation Notes

- **Client Short Code Generation:** collision‑safe (e.g., Crockford base32, 6–8 chars), uppercase, no ambiguous chars. Enforce uniqueness at DB and retry on collision.
- **Capability Keys:** declare alongside route handlers (decorators/annotations). Generate the registry during build.
- **UI Hiding:** consume `capabilities` context; components declare required capability/action.
- **Testing:** seed roles + a test Org/Client only in *test fixtures*, not production.
- **Migrations:** use transactional migrations; never ship default org data.
- **Extensibility:** add “Project” or “Study” levels later without breaking the permission model.
- **Do not use real school names**; keep examples generic for documentation only.

---

## 14) Deliverables for This Story

1. DB migrations for tables above with RLS enabled.  
2. First‑run `/api/bootstrap/org` + UI.  
3. Client creation (auto short code) + UI.  
4. Invitation flows (email/SMS via Twilio + provider‑agnostic email).  
5. Auth (login with short code) + MFA option.  
6. RBAC policy engine; role→route matrix; capability map API.  
7. Admin UX (Permission Editor, Route Explorer, Invite Console).  
8. Audit logging for all auth/permission events.  
9. Compliance docs: access review procedure, backups/DR, incident runbook templates.

---

## 15) Out‑of‑Scope (Now)
- Payment processing, billing, or non‑auth domain features.
- Advanced SSO provisioning (SCIM) — planned later.
- Granular field‑level permissions — consider in v2.

---

### Ready for Codex
This spec is self‑contained and safe to execute without static default data. Implement with your standard stack (e.g., NestJS + Postgres + RLS, Next.js/shadcn UI) and wire Twilio via server‑side actions and webhooks.
