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
- **QA** → Fatima El-Sayed, 

## 🧪 QA Bots: Tools & Responsibilities

QA bots participate after Dev and Review phases and can kick work back to Dev when checks fail.

- Tools
  - Playwright (TypeScript) for end-to-end tests under `apps/web/tests/e2e/*.spec.ts`.
  - HTTP sanity checks: API `/health`, Web `/login` to verify responsiveness.
  - Repo scripts: `scripts/health-check.sh`, `scripts/smoke-test.sh`, `scripts/walkthrough.sh`, `scripts/api-test.sh`.
  - Helpers: `scripts/qa-playwright.sh` (runs Playwright in the web container), `scripts/qa-unit.sh` (runs repo test scripts).

- Responsibilities
  - Dev bot: implement feature and include unit tests for API/Web changes. Place tests adjacent to the code (e.g., `apps/api/src/**/*.spec.ts`, `apps/web/**/*.test.tsx`).
  - Sr Dev Review bot: runs lint to assist reviewers; flags missing tests and risky changes.
  - QA bot: generate a Playwright spec for the user story and include it in the change set. Run HTTP checks and, in CI/local, execute `qa-playwright.sh` and `qa-unit.sh`.
  - Kickback: If Review (lint) or QA (checks/tests) fail, the ticket returns to “In Progress” with labels `review-failed` or `qa-failed`. Dev addresses issues and advances again.

- CI Integration (suggested)
  - Add CI jobs to run `scripts/qa-unit.sh` and `scripts/qa-playwright.sh` on PRs touching Web/API. Publish Playwright reports and fail the build on regressions.
