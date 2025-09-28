#!/usr/bin/env bash
set -euo pipefail

# Push current code to remote and create/push design-2 branches for epic + tickets
# Usage: bash scripts/git/push-design2-branches.sh AVNZ-10 AVNZ-11 AVNZ-12 AVNZ-13 AVNZ-14 AVNZ-15

ROOT_DIR=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT_DIR"

if [[ -f .env ]]; then set -a; source .env; set +a; fi

: "${GIT_WORK_BRANCH:=design-2}"
: "${GIT_REMOTE_URL:?GIT_REMOTE_URL is required (use HTTPS with token)}"

# Expand $GITHUB_TOKEN placeholder in URL if present
if [[ "$GIT_REMOTE_URL" == *"
$GITHUB_TOKEN"* && -n "${GITHUB_TOKEN:-}" ]]; then
  GIT_REMOTE_URL="${GIT_REMOTE_URL//\$GITHUB_TOKEN/$GITHUB_TOKEN}"
fi

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Not a git repository: $ROOT_DIR" >&2; exit 1; }

git config user.name  "${GIT_AUTHOR_NAME:-Avnz Bot}"
git config user.email "${GIT_AUTHOR_EMAIL:-bot@avnz.io}"

# Ensure remote
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$GIT_REMOTE_URL"
else
  git remote add origin "$GIT_REMOTE_URL"
fi

git fetch --all --prune || true

EPIC_KEY="${1:-}"
shift || true
if [[ -z "$EPIC_KEY" ]]; then
  echo "Usage: $0 EPIC_KEY [TICKET_KEYS...]" >&2
  exit 1
fi

# Create epic branch from current HEAD
EPIC_BRANCH="$GIT_WORK_BRANCH/$EPIC_KEY"
git checkout -B "$EPIC_BRANCH"
git push -u origin "$EPIC_BRANCH" --force-with-lease

# Create ticket branches from current HEAD and push
for TK in "$@"; do
  BR="$GIT_WORK_BRANCH/$EPIC_KEY/$TK"
  git checkout -B "$BR"
  git push -u origin "$BR" --force-with-lease
done

# Return to epic branch
git checkout "$EPIC_BRANCH"
echo "Pushed branches: $EPIC_BRANCH ${@:+and tickets: $*}"

