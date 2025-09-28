Jira Backlog Import

This folder contains a CSV you can import into the AVNZ Jira project to create an initial backlog derived from SUMMARY.MD, TODOS.md, and RPS_TASK.md.

How to import
- In Jira: Jira settings → System → External System Import → CSV.
- Choose the CSV in this folder, set Project = AVNZ.
- Map columns:
  - Project Key → Project
  - Issue Type → Issue Type
  - Summary → Summary
  - Description → Description
  - Priority → Priority
  - Assignee → Assignee
  - Labels → Labels
  - Components → Components
  - Epic Name → Epic Name (for Epic rows only)
  - Epic Link → Epic Link (for child issues; set to the Epic Name)
- If Assignee "Emma Johansson" does not resolve, import anyway and bulk-assign after.

Notes
- All items are labeled: backlog, autogen, codex, brave-mode.
- You can edit the CSV prior to import to adjust priorities, components, or ownership.

