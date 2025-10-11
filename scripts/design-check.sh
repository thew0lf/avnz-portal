#!/usr/bin/env bash
set -euo pipefail

# Simple design compliance scan for web components/pages.
# Prints warnings for common anti-patterns; does not fail the build.

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT/apps/web"

warn=0

function check() {
  local pattern="$1" msg="$2"
  local hits
  hits=$(rg -n --hidden --glob '!node_modules' --glob '!**/*.map' "$pattern" || true)
  if [[ -n "$hits" ]]; then
    echo "[warn] $msg"
    echo "$hits" | sed 's/^/  /'
    warn=$((warn+1))
  fi
}

echo "[design-check] Scanning apps/web for design compliance hints..."

# Direct use of bootstrap/material/antd buttons instead of shadcn Button
check "import\\s+Button\\s+from\\s+'react-bootstrap/" "Direct Bootstrap Button import found; use shadcn Button instead."
check "from\\s+'antd'" "Ant Design import found; use shadcn components instead."

# Plain button elements with many classes (heuristic)
check "<button[^>]*class(Name)?=\\\"[^\\\"]{40,}\\\"" "Large styled <button> found; prefer shadcn Button."

# Native title attributes on interactive elements
check "title=\\\"[^\\\"]+\\\"" "Native title attribute found; prefer shadcn Tooltip."

# Card usage: warn if <Card> appears without a <CardHeader> in the same file
while IFS= read -r f; do
  if rg -N --no-line-number "<Card\\b" "$f" >/dev/null && ! rg -N --no-line-number "<CardHeader\\b" "$f" >/dev/null; then
    echo "[warn] $f: <Card> without <CardHeader>"
    warn=$((warn+1))
  fi
done < <(rg -l --hidden --glob '!node_modules' --glob '!**/*.map' "<Card\\b" || true)

# Tables: warn if files define Issue/ID columns without font-mono
while IFS= read -r f; do
  if rg -N --no-line-number "(accessorKey:\s*'issue_key'|header:\s*'Issue'|header:\s*'ID'|accessorKey:\s*'id')" "$f" >/dev/null; then
    if ! rg -N --no-line-number "font-mono" "$f" >/dev/null; then
      echo "[warn] $f: Issue/ID column detected without font-mono styling"
      warn=$((warn+1))
    fi
  fi
done < <(rg -l --hidden --glob '!node_modules' --glob '!**/*.map' "accessorKey:|'Issue'|header: 'ID'" || true)

# Raw <table> usage: prefer shadcn DataTable unless read-only static table
check "<table\\b" "Raw <table> used; prefer shadcn DataTable for interactive admin tables."

echo "[design-check] Completed with $warn warning(s)."
exit 0
