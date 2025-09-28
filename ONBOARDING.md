# 🚀 ONBOARDING.md – Avnz App Setup Guide

## 🎯 Purpose
This document is the **entry point** for setting up the **Avnz App** project environment.  
It links to the Jira and Confluence setup guides so Codex (or new team members) can follow one unified process.  

---

## 📌 Steps Overview

1. **Jira Setup**  
   Configure the Avnz App project in Jira with full team creation, roles, workflows, and automation.  
   👉 [JIRA.md](./JIRA.md)

2. **Confluence Setup**  
   Create and configure the Avnz App Confluence space for documentation and link it to Jira.  
   👉 [CONFLUENCE.md](./CONFLUENCE.md)

3. **Team Alignment**  
   - Ensure all team members are added with `@avnz.io` emails.  
   - Verify permissions and role assignments.  
   - Confirm Jira tasks link correctly to Confluence documentation.  

---

## 🔄 Task & Workflow Rules

- **Task Creation:**  
  All new tasks must be sent to the **Product Owner** who will create the ticket in Jira.  

- **Responsibility:**  
  Each user is responsible for **updating tickets** and **processing them** as they progress through the board.  

- **Workflow Stages (default):**  
  `To Do → In Progress → 1st Review → Sr Dev Review → QA → Done`  

- **Workflow Flexibility:**  
  - The workflow may be **modified as needed** by the Product Owner and Scrum Master.  
  - Each ticket must have **assigned roles** for:  
    - **1st Reviewer** (peer developer)  
    - **Sr Dev Reviewer** (Tech Lead)  
    - **QA Reviewer** (assigned QA team member)  
  - If a different person takes ownership of a ticket, they must also **take over the ticket assignment** in Jira.  

- **Completion Rules:**  
  - Tickets marked **Done** must include a **comment** summarizing the work.  
  - Code must be **pushed to Git** with the **Jira ticket number annotated** in the commit message.  

- **Board Management:**  
  - Organize boards by swimlanes as needed (Dev, QA, DevOps, Product).  
  - Use **webhooks** for Slack/Email notifications as necessary.  

- **Integration with Avnz Admin Portal:**  
  Continue using the **current task system in the Avnz Admin Portal**, ensuring Jira tickets remain the single source of truth.  

---

## ✅ Acceptance Criteria

- Jira project **Avnz App (AVNZ)** fully configured with team, roles, workflows, and automation.  
- Confluence space **Avnz App** created with roster, responsibilities, and page tree.  
- Jira–Confluence integration is active (Epics/Stories visible in Confluence).  
- **All tasks flow through Jira** with Product Owner creating tickets.  
- **Users update tickets** as they progress across the workflow.  
- **Each ticket has an assigned 1st Reviewer, Sr Dev Reviewer, and QA.**  
- **Git commits reference Jira ticket IDs.**  
- Webhooks and Avnz Admin Portal integrations are in place.  
- Workflow can be updated as needed to reflect team practices.  

---

## 📚 References
- [JIRA.md](./JIRA.md) – Jira team, workflow, and automation setup  
- [CONFLUENCE.md](./CONFLUENCE.md) – Confluence space and documentation setup  

---

## ⚙️ Environment Variables

The following values should be placed in your `.env` file for Jira API access:

```bash
JIRA_EMAIL=bill@tandgconsulting.com
JIRA_DOMAIN=tandgconsulting.atlassian.net
JIRA_API_TOKEN=
```
