#!/usr/bin/env bash
set -euo pipefail

# Auto-open a PR when a ticket is code-complete.
# Ensures a final commit message exists (AVNZ-###: Code complete) before opening the PR.
# Usage: scripts/git/auto-pr-when-done.sh AVNZ-123 [base=main]

ISSUE=${1:-}
BASE=${2:-main}

if [[ -z "$ISSUE" ]]; then
  echo "Usage: $0 AVNZ-123 [base=main]" >&2
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository" >&2; exit 1
fi

branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$branch" == "$BASE" ]]; then
  echo "Refusing to open PR from base branch: $BASE" >&2; exit 1
fi

# Verify working tree clean
if ! git diff --quiet && ! git diff --cached --quiet; then
  echo "Working tree has changes; commit or stash first." >&2
  exit 1
fi

# Run preflight checks if present
if [[ -x scripts/health-check.sh ]]; then bash scripts/health-check.sh; fi
if [[ -x scripts/smoke-test.sh ]]; then bash scripts/smoke-test.sh; fi
if [[ -x scripts/walkthrough.sh ]]; then bash scripts/walkthrough.sh; fi

# Ensure last commit message contains the issue key. If not, add an empty
# marker commit to capture the "Code complete" signal for traceability.
last_msg=$(git log -1 --pretty=%B || true)
if ! grep -qE "\b${ISSUE}\b" <<<"$last_msg"; then
  git commit --allow-empty -m "${ISSUE}: Code complete"
fi

# Title and body
title=$(git log -1 --pretty=%s)
body=$(cat <<EOF
Auto-opened by bot after code completion and local checks passed.

- Issue: ${ISSUE}
- Branch: ${branch}
- Base: ${BASE}
EOF
)

# Create PR (requires gh auth)
gh pr create --base "$BASE" --head "$branch" --title "$title" --body "$body"

echo "PR created from $branch -> $BASE"

