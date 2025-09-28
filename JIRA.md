# 📄 JIRA.md – Avnz App Team Setup

## 🎯 Objective
Configure the **Avnz App** project in Jira with full Product, Development, QA, and DevOps teams.  
Create users with `@avnz.io` emails, add them to a team group, assign project roles, configure workflow, and link Jira with Confluence.  

---

## 👥 Team Roster with Emails

Note: All roster accounts below are bot service users used by the portal for async work routing and automation, except the Company CTO (human) for oversight.

| Name              | Role                         | Email                        | Type  |
|-------------------|------------------------------|------------------------------|-------|
| Emma Johansson    | Product Manager              | emma.johansson@avnz.io       | Bot   |
| Raj Patel         | Scrum Master                 | raj.patel@avnz.io            | Bot   |
| Lucas Meyer       | Senior Developer / Tech Lead | lucas.meyer@avnz.io          | Bot   |
| Carlos Hernández  | Mid-Level Developer          | carlos.hernandez@avnz.io     | Bot   |
| Sophia Li         | Mid-Level Developer          | sophia.li@avnz.io            | Bot   |
| David O’Connor    | Mid-Level Developer          | david.oconnor@avnz.io        | Bot   |
| Aisha Khan        | Junior Developer             | aisha.khan@avnz.io           | Bot   |
| Mateo Rossi       | Junior Developer             | mateo.rossi@avnz.io          | Bot   |
| Hannah Wright     | Junior Developer             | hannah.wright@avnz.io        | Bot   |
| Nguyen Minh       | Junior Developer             | nguyen.minh@avnz.io          | Bot   |
| Olivia Brown      | DevOps Engineer              | olivia.brown@avnz.io         | Bot   |
| Fatima El-Sayed   | Senior QA Manager            | fatima.elsayed@avnz.io       | Bot   |
| Daniel Kim        | QA Analyst                   | daniel.kim@avnz.io           | Bot   |
| Laura Silva       | QA Analyst                   | laura.silva@avnz.io          | Bot   |
| Michael Carter    | QA Analyst                   | michael.carter@avnz.io       | Bot   |
| Anastasia Petrov  | Automation QA Engineer       | anastasia.petrov@avnz.io     | Bot   |
| Priya Desai       | AI Engineer                  | priya.desai@avnz.io          | Bot   |
| Ethan Zhao        | Security & Compliance        | ethan.zhao@avnz.io           | Bot   |
| Lina Alvarez      | Designer / UX                | lina.alvarez@avnz.io         | Bot   |
| Marco Silva       | Data / Analytics             | marco.silva@avnz.io          | Bot   |
| Bill Cuevas       | Company CTO                  | bill.cuevas@avnz.io          | Human |

---

## ⚙️ Environment Setup

Create a `.env` file in the project root with:

```bash
JIRA_EMAIL=bill@tandgconsulting.com
JIRA_API_TOKEN=your_api_token_here
JIRA_DOMAIN=tandgconsulting.atlassian.net
```

---

## 🛠️ Jira Configuration Steps

### 1. Create Jira Group
Group name: `avnz-app-team`

```bash
curl -s -X POST   -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)"   -H "Content-Type: application/json"   "https://$JIRA_DOMAIN/rest/api/3/group"   -d '{"name":"avnz-app-team"}'
```

---

### 2. Add Users to Group
Create users with the above emails. Then, add them to `avnz-app-team`:

```bash
curl -s -X POST   -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)"   -H "Content-Type: application/json"   "https://$JIRA_DOMAIN/rest/api/3/group/user?groupname=avnz-app-team"   -d '{"accountId":"<ACCOUNT_ID>"}'
```

⚠️ Repeat for each user after retrieving their `accountId`.

---

### 3. Get Project Role IDs

```bash
curl -s -X GET   -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)"   "https://$JIRA_DOMAIN/rest/api/3/project/AVNZ/role" | jq .
```

---

### 4. Assign Roles

- **Administrators** → Emma Johansson (PM), Raj Patel (Scrum Master)  
- **Developers** → Lucas Meyer, Carlos Hernández, Sophia Li, David O’Connor, Aisha Khan, Mateo Rossi, Hannah Wright, Nguyen Minh, Olivia Brown  
- **QA** → Fatima El-Sayed, Daniel Kim, Laura Silva, Michael Carter, Anastasia Petrov  

Example (replace `<ROLE_ID>` and `<acct_*>`):

```bash
curl -s -X POST   -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)"   -H "Content-Type: application/json"   "https://$JIRA_DOMAIN/rest/api/3/project/AVNZ/role/<ROLE_ID>"   -d '{"user":["<acct_Emma>","<acct_Raj>"]}'
```

---

### 5. Configure Workflow (Team‑managed, current Jira UI)

AVNZ is a Team‑managed (next‑gen) project. In Team‑managed projects you manage statuses primarily through the Board Columns UI, not the global workflow editor.

- Recommended statuses (final state):  
  `To Do → In Progress → In Review → QA Testing → Blocked → Done`

- Add/move statuses via Board Columns
  - Open your board, then More (···) → Board settings → Columns.  
    Direct link for AVNZ board: `/jira/software/c/projects/AVNZ/boards/57/settings/columns`  
  - Add columns (if missing): “In Review”, “QA Testing”, “Blocked”.
  - Map statuses:  
    - In Review: 1st review, Sr Dev Review  
    - QA Testing: QA  
    - In Progress: In Progress  
    - Blocked: Blocked (create this status if it doesn’t exist; it will inherit the In Progress category)

- Alternative workflow view in Team‑managed  
  Project → Settings → Issue types → pick an issue type → Workflow → Edit. Add the “Blocked” status there if preferred, then it can be mapped under Board settings → Columns.

- Automation (optional)  
  - When an issue transitions to In Review, auto-create a QA sub‑task.  
  - Prevent transition to Done unless QA sub‑task is Done.  
  - Set defaults: Epics/Stories → Product Manager; Bugs → QA Manager.

---

### 6. Confluence Integration

- Create **Confluence Space: Avnz App**.  
- Create a page: **Avnz App Team Roster & Responsibilities**.  
- Link Epics/Stories to Confluence docs for requirements and retrospectives.  
- Scrum Master ensures Confluence pages stay updated (meeting notes, retros, velocity).  

---

## 📋 Subtask Breakdown

- [ ] Create Jira group `avnz-app-team`  
- [ ] Create accounts with `@avnz.io` emails  
- [ ] Add users to `avnz-app-team` group  
- [ ] Fetch role IDs for Avnz App project  
- [ ] Assign Administrators (PM + Scrum Master)  
- [ ] Assign Developers (Tech Lead, Mid, Junior, DevOps)  
- [ ] Assign QA Team (QA Lead, Analysts, Automation QA)  
- [ ] Configure workflow statuses & transitions  
- [ ] Add automation rules for QA handoff & sign-off  
- [ ] Create Confluence space for Avnz App  
- [ ] Document roster, responsibilities, and workflows in Confluence  

---

## ✅ Acceptance Criteria

- All users added with `@avnz.io` emails  
- Jira group `avnz-app-team` created and populated  
- Roles assigned correctly in Avnz App project  
- Workflow automation enabled  
- Confluence space created with documentation

---

## 🔁 Automation Flow (Portal Integration)

Goal: Issues flow through development automatically — when Jira moves an issue to In Progress, the portal queues work; when the portal completes, Jira is updated and advanced (e.g., to In Review), and QA steps can be auto-queued.

### Webhook → Portal (required)
- Endpoint (ngrok/public): `POST {NGROK_PUBLIC_URL}/jira/events/{orgCode}`
- Header: `X-Jira-Secret: <shared_secret>`
- Body (JSON): include event, changelog, and issue details. Example (Automation → Send web request → Custom data):

```json
{
  "event": "jira:issue_updated",
  "changelog": { "items": [ { "field": "status", "toString": "In Progress" } ] },
  "issue": {
    "id": "{{issue.id}}",
    "key": "{{issue.key}}",
    "fields": {
      "summary": "{{issue.summary}}",
      "description": "{{issue.description}}",
      "status": { "name": "In Progress" }
    }
  },
  "user": { "displayName": "{{initiator.displayName}}" }
}
```

The portal verifies the secret per org. Store the secret in Admin → Secrets (`service=jira`, `name=webhook_secret`), or use `JIRA_WEBHOOK_SECRET` for local.

### Direct Queue (belt-and-suspenders)
Add a second Automation action to queue a portal job directly. This ensures a job is created even if a webhook is delayed, and the portal still deduplicates via `jira_jobs`.

- Endpoint: `POST {NGROK_PUBLIC_URL}/api/agents/jobs`
- Headers: `Content-Type: application/json`
- Body:

```json
{ "task": "[Jira {{issue.key}}] {{issue.summary}}\n\n{{issue.description}}", "meta": { "jira_issue_key": "{{issue.key}}" } }
```

### Portal → Jira (on completion)
When a portal job completes, the portal posts a comment to the issue with a brief usage summary and the plan/implementation/review snippets, and optionally transitions the issue to the next status (default: In Review).

Environment (portal API):
- `SERVICE_TOKEN` — required for internal callbacks
- `JIRA_TRANSITION_ON_COMPLETE=In Review` — optional target status

### Backfill + Polling (catch-up safety)
To ensure no work is missed:
- On API startup: backfill queries Jira for all `In Progress` issues and queues any missing jobs.
- Polling (optional): set `JIRA_BACKFILL_INTERVAL_SEC` (e.g., `300`) to repeat the backfill periodically.

Environment (portal API):
- `JIRA_BACKFILL_ON_START=1`
- `JIRA_PROJECT_KEY=AVNZ`
- `JIRA_DEFAULT_ORG_CODE=<your_org_code>`
  - `JIRA_BACKFILL_INTERVAL_SEC=300` (optional)

### Phase Gate: Work‑Before‑Transition (Required)
- Do not advance issues to the next phase until the corresponding portal job has completed successfully.
- Jira Automation must not auto‑transition on its own; it may only queue work (webhook/direct‑queue) or trigger validation tasks (QA/Test/Audit).
- The portal (agents‑complete) is the authoritative gate that moves an issue forward after work is finished (and comments the results for auditability).
- To hold an issue in its current phase for manual review, apply the lock label (default `assignee-locked`) or populate the phase‑owner field; the portal will not override the assignee or state.

### Ticket Content Standard (Required)
- Every ticket must include a high-quality description that covers:
  - Context: 2–3 sentence problem statement
  - User Story: As a <role>, I want <capability>, so that <benefit>
  - Acceptance Criteria: check-list form
  - Definition of Done
  - Implementation Guide: code pointers, endpoints, migrations, flags
  - Testing & QA Details: unit/integration coverage and manual steps
  - Risk & Rollback
- The portal can auto-enrich new tickets (issue_created) with this structure, but the PM/Owner remains responsible for verifying/editing the details.

### Specificity & Accuracy (Required)
- Descriptions must be tailored to the specific ticket. Do not use generic boilerplate or speculative/fabricated information.
- If exact details are unknown, mark items as `TBD` with an explicit owner and due date, rather than inventing content.
- Automation may propose initial structure, but PM/Owner must verify factual accuracy and replace placeholders before a ticket is allowed to advance.
- The portal blocks transitions when placeholder markers are detected (e.g., `As a <role>`, `Criteria 1`, generic “Provide a 2–3 sentence problem statement”). The ticket will be labeled `needs-details` with a comment prompting completion.

### Priority Policy (Required)
- Every ticket must have a meaningful Priority; do not leave as “Lowest” or empty.
- Default policy: assign Medium unless the PM/Owner sets a higher/lower priority based on impact and urgency.
- Automation: The portal may default Priority to Medium on newly created issues if missing/Lowest (configurable per org via `default_priority`).
- Bulk update helper:
  - Use `scripts/jira-set-default-priority.sh 'project = AVNZ AND (priority is EMPTY OR priority = Lowest)' Medium` to normalize legacy backlogs.
### Status Map (recommended)
- To Do → In Progress → In Review → QA Testing → Done
- Automation examples:
  - When → In Progress → send webhook + direct queue
  - When → In Review → optionally queue a QA job: send to `/api/agents/jobs` with task "[QA {{issue.key}}] Validate acceptance criteria…"
  - When → Done → optionally queue an audit job to summarize changes/tests

### Operations
- Secrets: Set Jira webhook secret per org in the portal at `/admin/secrets`.
- ngrok: Start and set `NGROK_PUBLIC_URL` so admins see the full Request URL on the Slack/Jira dashboard pages.

### Role-based Assignment (Configurable)
- The portal assigns issues automatically to phase owners without hardcoding names.
- Configure per-org assignees in Admin → Secrets (`service=jira`). Values can be a single name/email or a comma/semicolon‑separated list to enable distribution:
  - `assignee_dev`, `assignee_review`, `assignee_qa`, `assignee_test`, `assignee_audit`
  - Example: `assignee_dev = "Lucas Meyer|Senior Developer, Carlos Hernández|Developer; Sophia Li|Developer"` (display includes titles; assignment uses the name/email portion)
- Distribution policy:
  - Least-loaded selection (default): choose the user with the fewest open issues in the project (statusCategory != Done). Ties fall back to round‑robin (Redis key `rr:jira:assignee:{orgId}:{phase}`), else random if Redis unavailable.
  - Set `JIRA_LOAD_BALANCE=0` to disable load-based selection and use RR/random only.
- "Unless selected" rule:
  - If a phase owner field is populated on the issue (e.g., Reviewer/QA/Test/Audit custom fields), that user is assigned.
  - If a lock label is present (`JIRA_ASSIGNMENT_LOCK_LABEL`, default `assignee-locked`) or an assignee is already present on the issue, the portal will not override the assignee.
- Optional env fallback (local/dev):
  - `JIRA_ASSIGNEE_DEV`, `JIRA_ASSIGNEE_REVIEW`, `JIRA_ASSIGNEE_QA`, `JIRA_ASSIGNEE_TEST`, `JIRA_ASSIGNEE_AUDIT` (single value) or
  - `JIRA_ASSIGNEE_DEV_LIST` (CSV), etc., for multi‑user distributions.
- Field overrides (preferred when available): set Jira custom field ids to override per-phase assignment:
  - `JIRA_REVIEWER_FIELD_ID`, `JIRA_QA_FIELD_ID`, `JIRA_TEST_FIELD_ID`, `JIRA_AUDIT_FIELD_ID`
  - When a field is populated for a phase, the user in that field is assigned regardless of lists.

### Issue Enrichment (Auto-brief)
- New issues can be auto-enriched by the portal on `issue_created` webhooks:
  - The portal updates the issue description (or comments) with a structured brief containing:
    - Context, Acceptance Criteria, Definition of Done, Implementation Guide, Testing & QA Checklist, Risk & Rollback, Owner Notes (for Human Execution).
  - Label `auto-briefed` is added when possible.
- Backfill enrichment for existing issues:
  - Run: `scripts/jira-enrich-all.sh 'project = AVNZ AND statusCategory != Done'`
  - Requires `SERVICE_TOKEN` in `.env` and Jira credentials.

---

## 🤖 Jira Automation Rules (Templates)

## 🧰 Preparation Scripts

Before proceeding with automated processing, normalize the backlog so every ticket is actionable:

- Validate description, add auto-brief, set default priority:
  - `scripts/jira-prep-backlog.sh 'project = AVNZ AND statusCategory != Done' Medium --backfill`
  - Runs `jira-validate-and-enrich.sh` (adds ADF auto-brief comment and needs-details label when required sections are missing) and `jira-set-default-priority.sh` (sets Priority when missing/Lowest). With `--backfill`, queues In Progress issues.

- Manual commands (advanced):
  - `scripts/jira-validate-and-enrich.sh '<JQL>'`
  - `scripts/jira-set-default-priority.sh '<JQL>' Medium` (use `--force` to override existing priorities)
  - `scripts/jira-backfill-and-status.sh` (trigger backfill + print AI jobs)

Below are ready-to-paste recipes for Jira Cloud Automation (Project settings → Automation → Create rule). These use the portal endpoints documented above. Replace `{NGROK_PUBLIC_URL}` and `{orgCode}`.

### Rule A — In Progress → Queue portal work (webhook + direct queue)
- Trigger: Issue transitioned
  - From: Any status; To: In Progress
- Action 1: Send web request (POST)
  - URL: `{NGROK_PUBLIC_URL}/jira/events/{orgCode}`
  - Headers: `Content-Type: application/json`, `X-Jira-Secret: <your-secret>`
  - Web request body (Custom data):
```json
{
  "event": "jira:issue_updated",
  "changelog": { "items": [ { "field": "status", "toString": "In Progress" } ] },
  "issue": {
    "id": "{{issue.id}}",
    "key": "{{issue.key}}",
    "fields": {
      "summary": "{{issue.summary}}",
      "description": "{{issue.description}}",
      "status": { "name": "In Progress" }
    }
  },
  "user": { "displayName": "{{initiator.displayName}}" }
}
```
- Action 2: Send web request (POST) — direct queue (belt-and-suspenders)
  - URL: `{NGROK_PUBLIC_URL}/api/agents/jobs`
  - Headers: `Content-Type: application/json`
  - Body:
```json
{ "task": "[Jira {{issue.key}}] {{issue.summary}}\n\n{{issue.description}}", "meta": { "jira_issue_key": "{{issue.key}}" } }
```

### Rule B — In Review → Queue QA validation
- Trigger: Issue transitioned → In Review
- Action: Send web request (POST)
  - URL: `{NGROK_PUBLIC_URL}/api/agents/jobs`
  - Headers: `Content-Type: application/json`
  - Body:
```json
{ "task": "[QA {{issue.key}}] Validate acceptance criteria, generate or verify unit tests, propose edge cases.\n\nSummary: {{issue.summary}}\n\nDescription: {{issue.description}}", "meta": { "jira_issue_key": "{{issue.key}}", "phase": "qa" } }
```

### Rule C — QA Testing → Queue test execution (optional)
- Trigger: Issue transitioned → QA Testing
- Action: Send web request (POST)
  - URL: `{NGROK_PUBLIC_URL}/api/agents/jobs`
  - Headers: `Content-Type: application/json`
  - Body:
```json
{ "task": "[TEST {{issue.key}}] Execute/verify tests, summarize failures, propose fixes.\n\nSummary: {{issue.summary}}", "meta": { "jira_issue_key": "{{issue.key}}", "phase": "test" } }
```

### Rule D — Done → Queue audit summary (optional)
- Trigger: Issue transitioned → Done
- Action: Send web request (POST)
  - URL: `{NGROK_PUBLIC_URL}/api/agents/jobs`
  - Headers: `Content-Type: application/json`
  - Body:
```json
{ "task": "[AUDIT {{issue.key}}] Summarize implementation notes, risks, and test coverage; generate release notes.", "meta": { "jira_issue_key": "{{issue.key}}", "phase": "audit" } }
```

### Rule E — Comment contains "retest" → Queue re‑test (optional)
- Trigger: Issue commented
- Condition: `{{comment.body}}` contains `retest`
- Action: Send web request (POST)
  - URL: `{NGROK_PUBLIC_URL}/api/agents/jobs`
  - Headers: `Content-Type: application/json`
  - Body:
```json
{ "task": "[RETEST {{issue.key}}] Re-run QA validation after changes. Note: {{comment.body}}", "meta": { "jira_issue_key": "{{issue.key}}", "phase": "qa-retest" } }
```

### Rule F — Scheduled catch-up (safety net)
- Trigger: Scheduled
  - JQL: `project = AVNZ AND status = "In Progress"`
- Action: Send web request (POST)
  - URL: `{NGROK_PUBLIC_URL}/jira/events/{orgCode}`
  - Headers: `Content-Type: application/json`, `X-Jira-Secret: <your-secret>`
  - Body:
```json
{ "event": "jira:scheduled-backfill", "issuesJql": "project = AVNZ AND status = \"In Progress\"" }
```
Notes: The portal also runs its own startup/polling backfill; this scheduled rule adds an additional safety net in Jira.

## Quality Gate: No Placeholder Content (Required)
The portal must never insert generic placeholders into Jira issues. Enforcement:
- Prompts strictly forbid templates like `As a <role>`, `<capability>`, `<benefit>`, or `Criteria 1/2/3`.
- On AI completion, the API scans generated text for banned patterns. If detected, it skips description updates, applies the `needs-details` label, and posts a reminder comment.
- Transitions are blocked until concrete, ticket‑specific details are present.

## Epic Standards (Required)
Every EPIC must include the following sections in Description (ADF):
- Epic Goal — The outcome and why it matters.
- Scope — What is covered; Out of Scope — What is explicitly excluded.
- Deliverables — Concrete artifacts (endpoints, pages, scripts, docs, infra).
- Milestones — Key checkpoints/timeboxes.
- Success Metrics — Objective measures to declare the EPIC successful.
- Stakeholders & Dependencies — Owners, consumers, and blocking systems.
- Risks & Assumptions — Known risks, mitigation, and assumptions.
- Definition of Done — Conditions required to close the EPIC.

Automation/Enforcement:
- On job completion, if issuetype is Epic and required sections are missing, the portal adds `needs-epic-details`, comments the missing requirements, and skips transitions.
- Docgen prompts switch to EPIC mode when issuetype is Epic to generate these sections (no placeholders).

## Roles & Responsibilities

The project operates with clear role ownership to speed delivery and improve quality. Use these definitions when assigning issues and reviewing work.

- Product Owner (Emma Johansson)
  - Owns roadmap, Epics, and backlog prioritization; writes Epic Goal and Acceptance Criteria; approves scope and final acceptance; stakeholder comms.
- Tech Lead / Architect
  - Sets technical direction and patterns (RBAC, soft‑deletes, migrations, UI standards, security); reviews architecture and risky changes; signs off on migrations and API/RPS contracts.
- Web Engineer (Next.js App Router)
  - Implements admin/dashboard pages using shadcn; builds SPA forms + toasts; maintains `/api/*` web proxy routes; ensures mobile‑friendly, a11y, and consistent layouts; adds tests where applicable.
- API Engineer (NestJS)
  - Designs and implements controllers/endpoints with RBAC guards; authors idempotent SQL migrations under `db/init`; integrates secrets via Service Configs; implements webhooks and pricing/usage logic; hardens security.
- AI Engineer (FastAPI)
  - Implements AI service routers (e.g., RPS), docgen/orchestration logic, workers, PII redaction, embeddings/vector search; reports usage; ensures auth propagation (org/user) via tokens.
- QA Engineer
  - Creates test plans aligned to AC; runs health/smoke/walkthrough; writes/executes unit/integration tests; validates mobile/UI consistency; tracks defects and retests fixes.
- DevOps / SRE
  - Owns dev/CI/CD/infra: Docker Compose, ngrok, Terraform/K8s/Helm/Argo/KEDA/SQS, External Secrets/DNS; configures monitoring/logging; manages secrets; keeps environments healthy.
- Security & Compliance
  - Enforces SOC2 patterns: secrets in DB/SSM, audit log, non‑enumerating auth, CSP; reviews data flows/PII; conducts access reviews and security gates.
- Designer / UX
  - Ensures design consistency; validates shadcn usage, spacing/typography, responsive/mobile patterns; contributes to interaction design and a11y.
- Project Manager / Scrum Master
  - Runs ceremonies, unblocks teams, maintains board hygiene and metrics, coordinates cross‑team dependencies; communicates status/risks.
- Data / Analytics (optional)
  - Defines success metrics and dashboards; validates usage/pricing data; supports experiment and reporting needs.

Phase ownership and handoffs
- Dev → Review → QA → Test → Audit phases map to Jira transitions and worker phases.
  - Dev: implementation, unit tests, docs (SUMMARY.MD), usage instrumentation.
  - Review: code review (security/perf/RBAC/migrations/UI), actionable feedback.
  - QA: acceptance tests against AC; mobile/a11y/regression checks.
  - Test: broader execution or pre‑release validation; report defects.
  - Audit: release notes, risk/rollback, observability/alerts, final sign‑off.

Assignment defaults
- Configure per‑phase assignees under Admin → Secrets → service `jira` keys:
  - `assignee_dev`, `assignee_review`, `assignee_qa`, `assignee_test`, `assignee_audit`
  - Optional: `load_balance` (1 = least‑loaded), `assignment_lock_label` (default `assignee-locked`).
- The portal auto‑assigns on queue if no assignee is set (respects lock label if present).

### Quick Assignment Guide (Who to Assign)
- RPS Admin UI page (Next.js/shadcn) → Web Engineer; Reviewer → Tech Lead
- Web API proxy route (/api/...) → Web Engineer; Reviewer → API Engineer
- NestJS endpoint/controller + migration → API Engineer; Reviewer → Tech Lead
- AI FastAPI router/docgen/job orchestration → AI Engineer; Reviewer → API Engineer
- Pricing/Usage/Costs wiring → API Engineer; Reviewer → Tech Lead
- Doc updates (SUMMARY.MD, READMEs) → Product Owner or Engineer closest to change; Reviewer → Tech Lead
- CI/infra (Docker/Compose/Helm/Terraform/KEDA/SQS/Secrets) → DevOps/SRE; Reviewer → Tech Lead
- Security/compliance changes (secrets, auth, PII, CSP) → Security & Compliance; Reviewer → Tech Lead
- Design polish/UX copy/accessibility → Designer/UX; Reviewer → Product Owner
- Test plans/automation/smoke/walkthrough → QA Engineer; Reviewer → Tech Lead

Assignment guardrails (Required)
- The Company CTO (Bill Cuevas) must never be auto‑assigned to Jira issues. Portal assignment logic excludes CTO by default and honors an exclusion list.
- Configure additional excludes via Admin → Secrets → service `jira` → key `assignment_exclude` (CSV/semicolon/newline), or env `JIRA_ASSIGNMENT_EXCLUDE`.
- In Jira project settings, set Default assignee to “Unassigned” (or a routing bot), not the CTO.

### Keeping Bots Working (Stale Ticket Strategy)
- Webhooks: Primary trigger on status change (e.g., In Progress). Ensure 2xx and monitor API logs; retries handled by Jira Automation.
- Backfill: Portal polls every 5 minutes to queue any In Progress tickets missed by webhooks.
- Stale requeue (script): Use `scripts/jira-requeue-stale.sh [minutes]` to queue bot work for tickets not updated within a window (maps status→phase).
  - Default mapping: In Progress→dev, In Review→review, QA Testing→qa; Blocked→dev.
  - Example: `bash scripts/jira-requeue-stale.sh 30`.
- Jira Automation (optional safety net): Scheduled rule with JQL `statusCategory != Done AND updated <= -30m` → POST to `/jira/events/:orgCode` or `/api/agents/jobs` to re‑trigger.

### Branching & Merge Policy (Required)
- Branches:
  - Controlled by env `GIT_WORK_BRANCH` (default `design-2`).
  - Epic branch: `<GIT_WORK_BRANCH>/<EPIC_KEY>` (e.g., `design-2/AVNZ-10`).
  - Child ticket branch: `<GIT_WORK_BRANCH>/<EPIC_KEY>/<TICKET_KEY>` (e.g., `design-2/AVNZ-10/AVNZ-12`).
- Bot behavior:
  - Bots write code to the local repo; when enabled, they commit on the ticket branch and open a PR.
  - QA bots validate (health/smoke/tests) and post results to Jira. Require passing checks/labels before merge.
- Merge order:
  - Merge child ticket branches into the epic branch after QA approval and docs.
  - When all children complete under an epic, merge the epic branch into `design2`.
- Configure env for auto‑commit/PR on aiworker: `AUTO_COMMIT=1`, `GIT_REMOTE_URL`, `GITHUB_TOKEN`, `GITHUB_REPO`, `GIT_MAIN_BRANCH`.
