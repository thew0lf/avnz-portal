#!/usr/bin/env bash
set -euo pipefail

# test-openai-key-local.sh — Validate an OpenAI API key with curl
#
# Usage:
#   scripts/test-openai-key-local.sh --key "sk-..."    # pass key inline
#   OPENAI_API_KEY="sk-..." scripts/test-openai-key-local.sh
#   scripts/test-openai-key-local.sh                    # will prompt securely
#
# Exits 0 on success (HTTP 200), non‑zero on failure. Requires curl; jq is optional.

KEY="${OPENAI_API_KEY:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --key)
      KEY="$2"; shift 2;;
    -h|--help)
      echo "Usage: $0 [--key sk-...]"; exit 0;;
    *) echo "Unknown arg: $1" >&2; exit 2;;
  esac
done

if [[ -z "${KEY}" ]]; then
  read -r -s -p "Enter OPENAI_API_KEY: " KEY
  echo
fi

if [[ -z "${KEY}" ]]; then
  echo "[error] No key provided" >&2
  exit 2
fi

TMP_BODY=$(mktemp)
trap 'rm -f "$TMP_BODY"' EXIT

echo "[test] GET /v1/models"
CODE=$(curl -sS -o "$TMP_BODY" -w "%{http_code}" \
  -H "Authorization: Bearer ${KEY}" \
  https://api.openai.com/v1/models || true)

if [[ "$CODE" == "200" ]]; then
  if command -v jq >/dev/null 2>&1; then
    COUNT=$(jq -r '.data | length' < "$TMP_BODY" 2>/dev/null || echo "?")
    echo "[ok] HTTP 200 — models listed (count=$COUNT)"
  else
    echo "[ok] HTTP 200 — models listed"
    head -n 5 "$TMP_BODY" | sed 's/"id":/\n  id:/g' | sed -n '1,10p'
  fi
else
  echo "[fail] HTTP $CODE"
  if command -v jq >/dev/null 2>&1; then
    jq . < "$TMP_BODY" || cat "$TMP_BODY"
  else
    cat "$TMP_BODY"
  fi
  exit 1
fi

# Optional: minimal chat completion smoke (can be commented if undesired)
echo "[test] POST /v1/chat/completions (smoke)"
CODE=$(curl -sS -o "$TMP_BODY" -w "%{http_code}" \
  -H "Authorization: Bearer ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}' \
  https://api.openai.com/v1/chat/completions || true)

if [[ "$CODE" == "200" ]]; then
  if command -v jq >/dev/null 2>&1; then
    MSG=$(jq -r '.choices[0].message.content' < "$TMP_BODY" 2>/dev/null || echo "ok")
    echo "[ok] HTTP 200 — chat ok: ${MSG:0:60}"
  else
    echo "[ok] HTTP 200 — chat ok"
  fi
else
  echo "[warn] chat completion HTTP $CODE (this may be fine in restricted orgs)"
  if command -v jq >/dev/null 2>&1; then
    jq . < "$TMP_BODY" || cat "$TMP_BODY"
  else
    cat "$TMP_BODY"
  fi
fi

echo "[done] Key test complete"

