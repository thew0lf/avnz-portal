# 📄 CONFLUENCE.md – Avnz App Documentation Setup

## 🎯 Objective
Configure a **Confluence space** for the **Avnz App** project to store product, development, QA, and DevOps documentation.  
Ensure that Jira tasks are linked with Confluence pages, and maintain a single source of truth for the team.  

---

## 🛠️ Confluence Configuration Steps

### 1. Create Space
- Space Key: `AVNZ`
- Space Name: `Avnz App`
- Space Type: Team-managed

### 2. Set Permissions
- Grant `avnz-app-team` full **View/Edit** access.
- Restrict sensitive pages (like credentials or deployment keys) to Admins (Product Manager + Scrum Master + Tech Lead).

### 3. Create Initial Page Tree

```
Avnz App (Space Home)
├── Team Roster & Responsibilities
├── Product
│   ├── Roadmap
│   ├── Requirements & Epics
│   └── Backlog Grooming Notes
├── Development
│   ├── Architecture & Design
│   ├── API Documentation
│   ├── Coding Standards
│   └── CI/CD & Deployment Guides
├── QA
│   ├── Test Plans
│   ├── Regression Checklists
│   └── Bug Reports & Triage Process
├── DevOps
│   ├── Infrastructure Documentation
│   ├── Monitoring & Alerts
│   └── Security & Compliance
└── Meetings
    ├── Sprint Planning Notes
    ├── Daily Stand-up Summaries
    └── Retrospectives
```

### 4. Link Jira with Confluence
- Integrate **Avnz App Jira project (AVNZ)** with Confluence space.
- Add Jira macros to Confluence pages (e.g., display Epics and linked tasks).
- Ensure Product Manager and Scrum Master maintain alignment between Jira and Confluence.

### 5. Assign Responsibilities
- **Product Manager (Emma Johansson):** Maintains product roadmap and requirements docs.  
- **Scrum Master (Raj Patel):** Keeps meeting notes and retrospectives updated.  
- **Tech Lead (Lucas Meyer):** Maintains technical documentation and coding standards.  
- **Developers:** Update component-level documentation.  
- **QA Manager (Fatima El-Sayed):** Owns test plans, regression docs, and QA workflow pages.  
- **Automation QA (Anastasia Petrov):** Documents automated test coverage.  
- **DevOps (Olivia Brown):** Maintains infra, CI/CD, and monitoring docs.  

---

## 📋 Subtask Breakdown

- [ ] Create Confluence space `Avnz App` (key: AVNZ)  
- [ ] Configure permissions for `avnz-app-team` group  
- [ ] Create page tree (Team, Product, Dev, QA, DevOps, Meetings)  
- [ ] Link Jira project AVNZ with Confluence space  
- [ ] Add Jira macros to requirements and backlog pages  
- [ ] Populate initial team roster page with names, roles, and emails  
- [ ] Assign responsibility for documentation ownership  

---

## ✅ Acceptance Criteria

- Confluence space `Avnz App` created and accessible to team  
- Permissions applied (team-wide edit, restricted admin pages)  
- Page tree established with starter templates  
- Jira–Confluence integration active with linked Epics/Stories  
- Roster and responsibilities documented and published  
