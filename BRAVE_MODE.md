# 🦾 BRAVE_MODE.md — Jira “Brave Mode” + Slack Updates (Avnz App)

This guide configures **promptless Jira updates** for the **Avnz App (AVNZ)** project using:
- Jira Automation rules (silent transitions)
- Git commit conventions + CI signals
- Webhooks (Jira ⇄ Slack, Git ⇄ Jira)
- Optional CLI scripts for headless ops
- **Quiet-mode execution** for shell/Docker/CI

> Goal: Developers keep coding. Jira stays accurate. Slack gets the right updates. No naggy prompts.

---

## 🔐 Prereqs

**.env**
```bash
JIRA_EMAIL=bill@tandgconsulting.com
JIRA_DOMAIN=tandgconsulting.atlassian.net
JIRA_API_TOKEN=

SLACK_WEBHOOK_URL=        # incoming webhook (optional if using Slack App)
SLACK_CHANNEL=#avnz-app

SLACK_ACCESS_TOKEN=       # for Slack App with chat:write scope
SLACK_REFRESH_TOKEN=      # for token refresh flow
```

**Conventions**
- Project key: `AVNZ`
- Commit message: `AVNZ-123: concise description` (ticket ID **must** appear)
- Default workflow: `To Do → In Progress → 1st Review → Sr Dev Review → QA → Done`
- Custom fields (create if not present):
  - **First Reviewer** (User picker)
  - **Sr Dev Reviewer** (User picker)
  - **QA Assignee** (User picker)

---

## 🔄 Promptless Flow Overview

1. **Dev starts work** → pushes commit with `AVNZ-###` → Jira auto-transitions **To Do → In Progress**.  
2. **PR opened** → Jira moves **In Progress → 1st Review** and assigns **First Reviewer**.  
3. **Tech lead approval** → Jira moves **1st Review → Sr Dev Review**.  
4. **PR merged / build green** → Jira moves **Sr Dev Review → QA** and assigns **QA Assignee**.  
5. **QA passes** → Jira moves **QA → Done**, adds closing comment, and Slack announces.  
6. **At every step** → Slack receives concise updates in `#avnz-app` (+ threads for chatter).  

---

## 🤫 Quiet-Mode Execution (Shell, Docker, CI)

### Shell
```bash
set -euo pipefail
run() { "$@" >/dev/null 2>&1; }                     # fully quiet
run_errlog() { "$@" >/dev/null 2>>/var/log/avnz.err; }  # quiet, keep errors

# Example (quiet curl with failure signal)
run curl -sS --fail-with-body -H "Authorization: Basic $AUTH" "https://$JIRA_DOMAIN/rest/api/3/myself" || echo "curl failed" >&2
```

### curl
```bash
curl -sS --fail-with-body ...
```
- `-s` silent, `-S` show errors, `--fail-with-body` fail on 4xx/5xx and keep response body.

### Docker
```bash
docker build --quiet -t avnz/app .
docker pull -q ghcr.io/owner/avnz:latest
docker run -d --rm --name avnz-app ghcr.io/owner/avnz:latest
docker run -d --log-driver=none ghcr.io/owner/avnz:latest
```

### Docker Compose
```bash
docker compose pull --quiet
docker compose up -d --remove-orphans --quiet-pull
```

### CI (GitHub Actions)
```yaml
- name: Transition Jira
  run: ./transition.sh "$ISSUE" "$TRANSITION_ID" >/dev/null 2>&1
```

Keep Slack as the outward “signal”; keep consoles quiet in normal paths.

---

## 🚀 Brave Mode: Allowed Actions

When operating in Brave Mode, the following actions are explicitly allowed without additional prompts (apply quiet-mode where practical and log succinctly in commits/PRs):

- Run bash scripts: `bash scripts/*.sh` (health, smoke, walkthrough, utilities)
- Run Docker and Compose commands/scripts: `docker`, `docker compose` (build, up, down, logs, exec, pull; non-destructive prune)
- Run necessary local commands to build, lint, test, and verify services
- Change file and directory permissions/ownership within the workspace or containers when needed: `chmod`, `chown`, `chgrp`
- Request and use escalated permissions for shell commands when required by the environment (with a brief justification)

Safeguards and exceptions (still required in Brave Mode):

- Destructive actions (data loss risk) must be clearly called out or confirmed: volume deletes, `docker compose down -v`, `docker system prune -af --volumes`, force pushes, irreversible DB operations.
- Never hard‑code or commit secrets; use the existing secret storage mechanisms.
- Follow the soft‑delete policy for application data; avoid hard deletes.

## ✅ Brave Mode Definition of Done

- [ ] Commits with `AVNZ-###` auto-move **To Do → In Progress**  
- [ ] PR creation moves **In Progress → 1st Review** (assign First Reviewer)  
- [ ] Tech Lead approval moves **1st Review → Sr Dev Review** (assign Sr Dev)  
- [ ] Merge/green build moves **Sr Dev Review → QA** (assign QA)  
- [ ] QA pass moves **QA → Done** and comments with commit refs  
- [ ] Slack posts on each stage entry in `#avnz-app`  
- [ ] Reassignment enforces Assignee takeover  
- [ ] **Quiet-mode** applied across shell/Docker/CI  
- [ ] Workflow can evolve without breaking automations
