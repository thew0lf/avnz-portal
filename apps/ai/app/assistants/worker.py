import time
import os
import json
from typing import Optional

import redis

from .orchestrator import run_roundtable
from .jobs import rds, JOBS_LIST, JOB_KEY, set_job, new_job
import os
import pathlib
import subprocess
import shlex
import json
import urllib.request
import urllib.error


def main():
    rd = rds()
    print("[worker] started; waiting for jobs")
    while True:
        try:
            item = rd.brpop(JOBS_LIST, timeout=5)
            if not item:
                continue
            _, job_id_bytes = item
            job_id = job_id_bytes.decode("utf-8")
            key = JOB_KEY.format(id=job_id)
            raw = rd.get(key)
            job = json.loads(raw) if raw else {"id": job_id, "task": ""}
            task = job.get("task", "")
            print(f"[worker] processing job {job_id}: {task[:60]}")
            set_job(job_id, status="running", started_at=int(time.time()))
            try:
                meta = job.get("meta") or {}
                out = run_roundtable(task, meta)
                # Optional: apply code changes if provided (forced via meta or returned by model)
                try:
                    files = None
                    if isinstance(meta, dict) and isinstance(meta.get("force_files"), list):
                        files = meta.get("force_files")
                    elif isinstance(out, dict):
                        files = out.get("files")
                    if isinstance(files, list):
                        root = os.getenv("WORKSPACE_ROOT", "/workspace")
                        for f in files:
                            p = str((f or {}).get("path") or "").strip()
                            c = (f or {}).get("content")
                            if not p or c is None:
                                continue
                            dest = os.path.normpath(os.path.join(root, p.lstrip("/")))
                            # ensure inside workspace
                            if not dest.startswith(os.path.normpath(root) + os.sep):
                                continue
                            pathlib.Path(os.path.dirname(dest)).mkdir(parents=True, exist_ok=True)
                            with open(dest, "w", encoding="utf-8") as wf:
                                wf.write(str(c))
                except Exception as e:
                    # do not fail the job if code apply fails; include error in result
                    if isinstance(out, dict):
                        out["code_apply_error"] = str(e)

                # Optional: commit, test, push, and open PR
                try:
                    if os.getenv("AUTO_COMMIT", "0") == "1":
                        git_root = os.getenv("WORKSPACE_ROOT", "/workspace")
                        issue_key = (meta.get("jira_issue_key") or "job").strip()
                        phase = (meta.get("phase") or "dev").strip()

                        def resolve_epic_key(issue: str) -> str:
                            # Try to resolve epic key via Jira if creds provided; fallback to issue
                            jd = os.getenv("JIRA_DOMAIN", "").strip()
                            je = os.getenv("JIRA_EMAIL", "").strip()
                            jt = os.getenv("JIRA_API_TOKEN", "").strip()
                            if not (jd and je and jt and issue):
                                return issue
                            try:
                                import base64, urllib.request
                                auth = base64.b64encode(f"{je}:{jt}".encode()).decode()
                                def get(url: str):
                                    req = urllib.request.Request(url, headers={"Authorization": f"Basic {auth}", "Accept": "application/json"})
                                    with urllib.request.urlopen(req, timeout=6) as resp:
                                        return json.loads(resp.read().decode())
                                data = get(f"https://{jd}/rest/api/3/issue/{issue}?expand=names")
                                fields = data.get("fields", {})
                                # direct epic field (team-managed)
                                epic = fields.get("epic")
                                if isinstance(epic, dict) and epic.get("key"):
                                    return str(epic.get("key"))
                                # search for custom field named 'Epic Link'
                                names = data.get("names", {})
                                epic_field_id = None
                                for k,v in names.items():
                                    if isinstance(v, str) and v.lower() == 'epic link':
                                        epic_field_id = k; break
                                if epic_field_id and isinstance(fields.get(epic_field_id), dict) and fields.get(epic_field_id, {}).get('key'):
                                    return str(fields[epic_field_id]['key'])
                                # if issuetype is Epic, return self
                                it = fields.get('issuetype',{}).get('name','')
                                if str(it).lower() == 'epic':
                                    return issue
                            except Exception:
                                pass
                            return issue

                        epic_key = resolve_epic_key(issue_key)
                        # Branch naming scheme: <work-branch>/<EPIC>[/<TICKET>]
                        work_prefix = os.getenv("GIT_WORK_BRANCH", "design-2").strip() or "design-2"
                        if issue_key == epic_key:
                            branch = f"{work_prefix}/{epic_key}"
                        else:
                            branch = f"{work_prefix}/{epic_key}/{issue_key}"
                        author = os.getenv("GIT_AUTHOR_NAME", "Avnz Bot")
                        email = os.getenv("GIT_AUTHOR_EMAIL", "bot@avnz.io")
                        main_branch = os.getenv("GIT_MAIN_BRANCH", "main")

                        def run(cmd: str, cwd: str):
                            p = subprocess.run(shlex.split(cmd), cwd=cwd, capture_output=True, text=True)
                            return p.returncode, p.stdout, p.stderr

                        # init git if needed
                        rc,_,_ = run("git rev-parse --is-inside-work-tree", git_root)
                        if rc != 0:
                            # if workspace isn\'t a git repo, skip commit flow
                            raise RuntimeError("workspace is not a git repository")
                        run(f"git config user.name {shlex.quote(author)}", git_root)
                        run(f"git config user.email {shlex.quote(email)}", git_root)
                        # create branch
                        run(f"git checkout -B {shlex.quote(branch)}", git_root)
                        run("git add -A", git_root)
                        msg = f"{issue_key}: automate changes\n\n{(out.get('plan') if isinstance(out, dict) else '')}"
                        run(f"git commit -m {shlex.quote(msg)}", git_root)

                        # basic tests (best-effort) incl. lint if available
                        t_out = []
                        test_cmds = [
                            "bash scripts/lint.sh",
                            "bash scripts/health-check.sh",
                            "bash scripts/smoke-test.sh",
                        ]
                        for cmd in test_cmds:
                            rc, so, se = run(cmd, git_root)
                            t_out.append({"cmd": cmd, "rc": rc, "out": so[-4000:], "err": se[-4000:]})
                        if isinstance(out, dict): out["tests"] = t_out

                        # push if remote provided
                        remote = os.getenv("GIT_REMOTE_URL", "")
                        # allow placeholder replacement for token
                        gtok = os.getenv("GITHUB_TOKEN", "")
                        if "$GITHUB_TOKEN" in remote and gtok:
                            remote = remote.replace("$GITHUB_TOKEN", gtok)
                        if remote:
                            run("git remote remove origin", git_root)
                            run(f"git remote add origin {shlex.quote(remote)}", git_root)
                            run(f"git push -u origin {shlex.quote(branch)} --force-with-lease", git_root)
                            # create PR on GitHub if configured
                            gh_token = os.getenv("GITHUB_TOKEN", "")
                            repo = os.getenv("GITHUB_REPO", "")  # owner/name
                            if gh_token and repo:
                                import requests
                                title = msg.split("\n",1)[0] or (meta.get("jira_issue_key") or branch)
                                # derive epic branch as base if child branch
                                base_branch = main_branch
                                if "/" in branch:
                                    parts = branch.split("/")
                                    # work_prefix/EPIC[/TICKET]
                                    if len(parts) >= 2:
                                        base_branch = f"{parts[0]}/{parts[1]}"
                                payload = {"title": title, "head": branch, "base": base_branch, "body": out.get("implementation") if isinstance(out, dict) else ""}
                                r = requests.post(f"https://api.github.com/repos/{repo}/pulls", json=payload, headers={"Authorization": f"Bearer {gh_token}", "Accept": "application/vnd.github+json"}, timeout=10)
                                if isinstance(out, dict): out["pull_request"] = r.json()

                                # If this is QA phase completion, add label and optionally auto-merge
                                try:
                                    if str(phase).lower() == "qa":
                                        pr = r.json()
                                        pr_number = pr.get("number")
                                        if pr_number:
                                            # add label qa-approved
                                            requests.post(
                                                f"https://api.github.com/repos/{repo}/issues/{pr_number}/labels",
                                                json={"labels":["qa-approved"]},
                                                headers={"Authorization": f"Bearer {gh_token}", "Accept": "application/vnd.github+json"}, timeout=10
                                            )
                                            if os.getenv("AUTO_MERGE_CHILD","0") == "1":
                                                # try to merge PR
                                                requests.put(
                                                    f"https://api.github.com/repos/{repo}/pulls/{pr_number}/merge",
                                                    json={"merge_method":"squash"},
                                                    headers={"Authorization": f"Bearer {gh_token}", "Accept": "application/vnd.github+json"}, timeout=10
                                                )
                                except Exception:
                                    pass
                except Exception as e:
                    if isinstance(out, dict): out["commit_error"] = str(e)
                # attempt to post usage if meta has org/client/project and service token is set
                usage = (out.get("usage") if isinstance(out, dict) else None) or {}
                api_base = os.getenv("API_BASE_INTERNAL", "http://api:3001")
                svc_token = os.getenv("SERVICE_TOKEN", "")
                if api_base and svc_token and usage:
                    try:
                        payload = {
                            "provider": usage.get("provider") or "openai",
                            "model": usage.get("model") or "",
                            "operation": "agents.jobs.complete",
                            "input_tokens": int(usage.get("input_tokens") or 0),
                            "output_tokens": int(usage.get("output_tokens") or 0),
                            "embed_tokens": int(usage.get("embed_tokens") or 0),
                            "external_id": job_id,
                            "details": usage,
                            # pass context if available
                            "org_id": meta.get("org_id") or None,
                            "client_id": meta.get("client_id") or None,
                            "project_code": meta.get("project_code") or None,
                        }
                        import requests
                        requests.post(f"{api_base}/usage/events", json=payload, headers={"x-service-token": svc_token}, timeout=3)
                    except Exception:
                        pass
                set_job(job_id, status="done", finished_at=int(time.time()), result=out)
                try:
                    from .jobs import add_recent
                    add_recent(job_id)
                except Exception:
                    pass
                # Notify API for Jira linkage if present
                try:
                    jira_key = (meta or {}).get("jira_issue_key")
                    if jira_key and api_base and svc_token:
                        import requests
                        payload = {"job_id": job_id, "jira_issue_key": jira_key, "result": out, "meta": meta}
                        requests.post(f"{api_base}/jira/agents-complete", json=payload, headers={"x-service-token": svc_token}, timeout=3)
                except Exception:
                    pass

                # Optional Slack status when in AWAY mode
                try:
                    away = os.getenv("AWAY_MODE", "0") == "1" or os.path.exists("/workspace/.away_mode")
                    hook = os.getenv("SLACK_WEBHOOK_URL", "").strip()
                    if away and hook:
                        phase = (meta or {}).get("phase") or "dev"
                        text = f"[bots] {jira_key or job_id}: phase={phase} status=done\n"
                        if isinstance(out, dict) and out.get("pull_request"):
                            pr = out.get("pull_request") or {}
                            url = pr.get("html_url") or pr.get("url") or ""
                            if url:
                                text += f"PR: {url}\n"
                        data = json.dumps({"text": text}).encode("utf-8")
                        req = urllib.request.Request(hook, data=data, headers={"Content-Type":"application/json"})
                        urllib.request.urlopen(req, timeout=3)
                except Exception:
                    pass
                print(f"[worker] done {job_id}")
                # Phase orchestration: queue next phase automatically
                try:
                    phase = (meta or {}).get("phase") or "dev"
                    next_phase = None
                    if phase in (None, "", "dev"):
                        next_phase = "review"
                    elif phase == "review":
                        next_phase = "qa"
                    elif phase == "qa":
                        next_phase = "test"
                    elif phase == "test":
                        next_phase = "audit"
                    # 'audit' terminal: no further steps
                    if next_phase:
                        key = (meta or {}).get("jira_issue_key") or ""
                        summary_line = (out.get("plan") or "").splitlines()[0] if isinstance(out, dict) else ""
                        nxt_task = f"[{next_phase.upper()} Jira {key}] Follow-up for phase {next_phase}.\n{summary_line}".strip()
                        m2 = dict(meta or {})
                        m2["phase"] = next_phase
                        new_job(nxt_task, m2)
                except Exception:
                    pass
            except Exception as e:
                set_job(job_id, status="error", finished_at=int(time.time()), error=str(e))
                try:
                    from .jobs import add_recent
                    add_recent(job_id)
                except Exception:
                    pass
                print(f"[worker] error {job_id}: {e}")
        except Exception as loop_err:
            print("[worker] loop error:", loop_err)
            time.sleep(1)


if __name__ == "__main__":
    main()
