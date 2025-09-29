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
- **DevOps** → Olivia Brown  

---

## 🗂️ Board Flow (Bots)

- Statuses: To Do (Backlog) → In Progress → QA Testing → Done. Optionally Blocked.
- Forward transitions:
  - To Do → In Progress: Portal queues Dev on webhook/backfill; nothing should remain in Backlog once work starts.
  - Dev/Review pass → QA Testing; QA/Test pass → Done.
- Kickbacks:
  - Review (lint) failure → back to In Progress with label `review-failed`.
  - QA checks/test failure → back to In Progress with label `qa-failed`.
  - Dev fixes and the loop repeats until passing.

## ✅ Content Gate (Required to Advance)

Tickets move forward only when the description includes, with ticket‑specific details and no placeholders:
- Context
- User Story
- Acceptance Criteria
- Testing & QA

If missing/generic, the portal posts a reminder and adds label `needs-details` and holds the ticket in its current status.

## 🧪 QA Bots: Tools & Responsibilities

- Tools
  - Playwright (TypeScript) for end‑to‑end tests: `apps/web/tests/e2e/*.spec.ts`.
  - HTTP sanity checks: API `/health`, Web `/login`.
  - Repo scripts: `scripts/health-check.sh`, `scripts/smoke-test.sh`, `scripts/walkthrough.sh`, `scripts/api-test.sh`.
  - Helpers: `scripts/qa-playwright.sh` (web container), `scripts/qa-unit.sh`.

- Responsibilities
  - Dev bot: implement feature; include unit tests for API/Web changes next to the code.
  - Sr Dev Review bot: runs lint; flags risky changes and missing tests.
  - QA bot: generate a Playwright spec for the user story and include it in the change set. Run HTTP checks; in CI/local, run `qa-playwright.sh` and `qa-unit.sh`.
  - Kickback: Review/QA failures add `review-failed`/`qa-failed` and move ticket to In Progress with a concise comment summarizing failures (lint tail, API/Web status). Dev addresses and advances again.

## 🔧 Runtime & Env (Bots)

- Background worker enabled (ai service): `AGENTS_WORKER_AUTO=1`.
- Service token for completion callbacks: `SERVICE_TOKEN` set for the AI service.
- Web base for QA checks: `WEB_BASE_INTERNAL=http://web:3000`.
- Commit/PR automation (optional): `AUTO_COMMIT=1`, `GIT_REMOTE_URL`, `GITHUB_TOKEN`, `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`.

## 🔍 Monitoring & Operations

- Admin → Jira → Monitor:
  - Assignee Load, Stale Issues (requeue), Recent Jira Events, Recent Portal Jobs, Automation Health.
- Stuck triage scripts:
  - List stuck: `bash scripts/jira-list-stuck.sh 'project = AVNZ AND statusCategory != Done'`
  - Post content scaffold (comment): `bash scripts/jira-fix-details.sh AVNZ-###`
