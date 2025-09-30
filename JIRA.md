# 📄 JIRA.md – Avnz App Team Setup

## 🎯 Objective
Configure the **Avnz App** project in Jira with full Product, Development, QA, and DevOps teams.
Create users with `@avnz.io` emails, add them to a team group, assign project roles, configure workflow, and link Jira with Confluence.

## ⚙️ Environment Setup
Create a `.env` file in the project root with:

```bash
JIRA_EMAIL=bill@tandgconsulting.com
JIRA_API_TOKEN=your_api_token_here
JIRA_DOMAIN=tandgconsulting.atlassian.net
JIRA_PROJECT_KEY=your_project_key_here
JIRA_DEFAULT_ORG_CODE=your_org_code_here
```

### Important Variables
- **JIRA_DOMAIN**: Your Jira domain.
- **JIRA_EMAIL**: Email used for Jira.
- **JIRA_API_TOKEN**: API token for authentication.
- **JIRA_PROJECT_KEY**: Key for the Jira project.
- **JIRA_DEFAULT_ORG_CODE**: Default organization code.