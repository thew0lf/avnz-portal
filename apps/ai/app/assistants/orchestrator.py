import os
import sys
import argparse
from typing import List, Dict, Any, Optional, Tuple

from openai import OpenAI
import tiktoken
import requests
import os
from typing import Optional, Dict, Any


PLANNER_SYS = """
You are Planner-1. Given a user task, produce a concise, actionable plan:
- 3-7 numbered steps, each a clear, testable action
- Note key assumptions and risks
- Keep it under 120 words
""".strip()

IMPLEMENTER_SYS = """
You are Implementer-1. Given the task and the plan, produce concrete implementation guidance:
- Specific commands, code pointers, and file changes
- If code changes are needed, include a JSON field files: [{ path: string, content: string }]
- Keep it pragmatic, under 180 words
""".strip()

REVIEWER_SYS = """
You are Reviewer-1. Critique the plan and implementation:
- Identify risks, gaps, and test cases
- Suggest 1-2 improvements
- Keep it under 120 words
""".strip()

# Phase-specific system prompts (dev, review, qa, test, audit)
PHASE_PROMPTS: Dict[str, Dict[str, str]] = {
    "dev": {
        "planner": PLANNER_SYS,
        "implementer": IMPLEMENTER_SYS,
        "reviewer": REVIEWER_SYS,
    },
    "review": {
        "planner": "You are Code-Review Planner. Generate a focused review plan: key areas to inspect (logic, security, performance, migrations, UI/UX, accessibility). Keep it under 100 words.",
        "implementer": "You are Reviewer. Perform a structured review checklist based on the plan: call out defects, risky changes, missing tests, doc updates. Provide crisp actionable items under bullet points.",
        "reviewer": "You are Approver. Summarize go/no-go with top 3 concerns and quick wins. Under 80 words.",
    },
    "qa": {
        "planner": "You are QA Planner. Create acceptance tests aligned to user stories and edge cases. Include data setup. Keep it under 120 words.",
        "implementer": "You are QA Engineer. Write a step-by-step manual QA checklist and propose unit/integration tests. Include expected results and rollback checks.",
        "reviewer": "You are QA Lead. Identify gaps, flakiness risks, and add 2 additional edge cases. Under 80 words.",
    },
    "test": {
        "planner": "You are Test Planner. Outline test execution order and environment prerequisites (mocks/secrets/feature flags).",
        "implementer": "You are Test Runner. Summarize likely failures and how to debug quickly. Provide commands to run tests and collect logs.",
        "reviewer": "You are Test Reporter. Produce a pass/fail summary and next steps. Under 80 words.",
    },
    "audit": {
        "planner": "You are Auditor. Outline a brief audit of implementation, risk, and observability.",
        "implementer": "You are Release Notes Writer. Generate concise release notes and operational notes (metrics/alerts).",
        "reviewer": "You are Risk Officer. Call out residual risks and rollback trigger points.",
    },
}


def chat_with_usage(client: OpenAI, model: str, system: str, user: str):
    r = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
    )
    content = r.choices[0].message.content or ""
    usage = getattr(r, 'usage', None)
    in_tok = getattr(usage, 'prompt_tokens', None) or getattr(usage, 'input_tokens', 0) or 0
    out_tok = getattr(usage, 'completion_tokens', None) or getattr(usage, 'output_tokens', 0) or 0
    if not (in_tok or out_tok):
        # fallback: estimate with tiktoken
        try:
            enc = tiktoken.get_encoding('cl100k_base')
            in_tok = len(enc.encode(system + "\n" + user))
            out_tok = len(enc.encode(content))
        except Exception:
            in_tok = in_tok or 0
            out_tok = out_tok or 0
    return content, int(in_tok), int(out_tok)


def _collect_code_context(task: str, root: str = "/workspace", limit_files: int = 8, max_bytes: int = 4000) -> str:
    try:
        import re, os
        terms = [t for t in re.split(r"[^a-z0-9]+", task.lower()) if len(t) >= 3]
        if not os.path.isdir(root):
            return ""
        hits: List[Tuple[int,str]] = []
        for base, _, files in os.walk(root):
            if any(seg in base for seg in [".git", ".next", "node_modules", "dist", "__pycache__"]):
                continue
            for fn in files:
                if not any(fn.endswith(ext) for ext in (".ts",".tsx",".js",".py",".sql",".md")):
                    continue
                p = os.path.join(base, fn)
                path_lower = p.lower()
                score = sum(1 for t in terms if t and t in path_lower)
                if score:
                    hits.append((score, p))
        hits.sort(key=lambda x: (-x[0], x[1]))
        excerpts: List[str] = []
        for _, p in hits[:limit_files]:
            try:
                with open(p, "r", encoding="utf-8", errors="ignore") as f:
                    data = f.read(max_bytes)
                rel = p.replace(root+"/","/") if p.startswith(root+"/") else p
                excerpts.append(f"\n--- FILE: {rel}\n{data}\n")
            except Exception:
                pass
        return ("\n".join(excerpts)).strip()
    except Exception:
        return ""


def run_roundtable(task: str, meta: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY missing. Set it in the environment (ai service).")
    model = os.getenv("ASSISTANTS_MODEL", "gpt-4o-mini")
    # honor HTTP(S)_PROXY via httpx client when present
    client = OpenAI(api_key=api_key)
    phase = (meta or {}).get("phase") or "dev"
    prompts = PHASE_PROMPTS.get(str(phase).lower(), PHASE_PROMPTS["dev"])
    # optional code context to improve specificity
    code_ctx = _collect_code_context(task)
    # planner
    planner_user = f"Task: {task}\n\nRelevant code context (snippets, may be partial):\n{code_ctx}" if code_ctx else f"Task: {task}"
    plan_text, p_in, p_out = chat_with_usage(client, model, prompts["planner"], planner_user)
    # implementer
    impl_user = f"Task: {task}\n\nPlan:\n{plan_text}\n\nRelevant code context:\n{code_ctx}" if code_ctx else f"Task: {task}\n\nPlan:\n{plan_text}"
    impl_text, i_in, i_out = chat_with_usage(client, model, prompts["implementer"], impl_user)
    # reviewer
    rev_user = f"Task: {task}\n\nPlan:\n{plan_text}\n\nImplementation:\n{impl_text}\n\nCode context:\n{code_ctx}" if code_ctx else f"Task: {task}\n\nPlan:\n{plan_text}\n\nImplementation:\n{impl_text}"
    rev_text, r_in, r_out = chat_with_usage(client, model, prompts["reviewer"], rev_user)
    total_in = p_in + i_in + r_in
    total_out = p_out + i_out + r_out
    result = {
        "plan": plan_text,
        "implementation": impl_text,
        "review": rev_text,
        "usage": {
            "provider": "openai",
            "model": model,
            "input_tokens": total_in,
            "output_tokens": total_out,
            "steps": {
                "planner": {"in": p_in, "out": p_out},
                "implementer": {"in": i_in, "out": i_out},
                "reviewer": {"in": r_in, "out": r_out},
            }
        }
    }
    # Optionally, post usage to API if configured
    api_base = os.getenv('API_BASE_INTERNAL', 'http://api:3001')
    try:
        if api_base and (total_in or total_out):
            payload = {
                "provider": "openai",
                "model": model,
                "operation": "agents.jobs.complete",
                "input_tokens": total_in,
                "output_tokens": total_out,
                # embed_tokens: 0 by default
                # Optional fields like project_code/client_id would need to be passed in; leaving for future wiring
                "details": result.get("usage"),
            }
            # This call will likely be unauthorized without service auth; wrap in try/except silently
            requests.post(f"{api_base}/usage/events", json=payload, timeout=2)
    except Exception:
        pass
    return result


def main(argv: List[str]) -> int:
    ap = argparse.ArgumentParser(description="Multi-agent roundtable orchestrator")
    ap.add_argument("--task", required=True, help="Task description to solve")
    args = ap.parse_args(argv)
    out = run_roundtable(args.task)
    print("=== Plan ===\n" + out["plan"].strip())
    print("\n=== Implementation ===\n" + out["implementation"].strip())
    print("\n=== Review ===\n" + out["review"].strip())
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
