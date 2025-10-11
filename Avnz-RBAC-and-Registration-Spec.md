# Avnz Multi‑Tenant Auth & RBAC Spec (SOC 2 / ISO 27001–aligned)

> **Audience:** Codex CLI / implementation agents  
> **Goal:** Implement a secure, dynamic, multi‑tenant authentication, registration, and RBAC system (no static org data) with client short codes, email/SMS invitations (Twilio), route‑level permissions, and strong auditability.

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
  - **Payload:** signed, sin
