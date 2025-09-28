#!/usr/bin/env bash
set -euo pipefail

# Slack webhook test helper for local development
# - Sends either a url_verification or event_callback payload
# - Computes Slack v0 signature with SIGNING_SECRET
#
# Usage:
#   ./scripts/slack-test.sh challenge -o ORG_CODE -s SIGNING_SECRET [-a API_BASE]
#   ./scripts/slack-test.sh message "Hello from test" -o ORG_CODE -s SIGNING_SECRET [-a API_BASE] [-c C123] [-u U123] [-t T123]
#
# Defaults:
#   API_BASE: ${API_BASE:-${NGROK_PUBLIC_URL:-http://localhost:3001}}
#
# Notes:
# - The API must be running and the org must exist.
# - The server must have the same signing secret configured (Admin → Service Secrets: service=slack, name=signing_secret).

API_BASE_DEFAULT="${API_BASE:-${NGROK_PUBLIC_URL:-http://localhost:3001}}"

die(){ echo "Error: $*" >&2; exit 1; }

sign_and_post(){
  local body="$1" url="$2" secret="$3"
  local ts
  ts="$(date +%s)"
  local base="v0:${ts}:${body}"
  # Compute hex digest
  local sig_hex
  sig_hex="$(printf "%s" "$base" | openssl dgst -sha256 -hmac "$secret" | sed 's/^.* //')"
  local signature="v0=${sig_hex}"
  curl -sS -D - \
    -H "Content-Type: application/json" \
    -H "X-Slack-Signature: ${signature}" \
    -H "X-Slack-Request-Timestamp: ${ts}" \
    --data "$body" \
    "$url" | sed -n '1,200p'
}

cmd="${1:-}"; shift || true
text=""
ORG_CODE=""
SIGNING_SECRET=""
API_BASE="$API_BASE_DEFAULT"
CHANNEL="C000TEST"
USER="U000TEST"
TEAM="T000TEST"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--org|--org-code) ORG_CODE="$2"; shift 2;;
    -s|--secret|--signing-secret) SIGNING_SECRET="$2"; shift 2;;
    -a|--api) API_BASE="$2"; shift 2;;
    -c|--channel) CHANNEL="$2"; shift 2;;
    -u|--user) USER="$2"; shift 2;;
    -t|--team) TEAM="$2"; shift 2;;
    *) if [[ -z "$text" ]]; then text="$1"; shift; else shift; fi;;
  esac
done

[[ -n "$ORG_CODE" ]] || die "Missing -o ORG_CODE"
[[ -n "$SIGNING_SECRET" ]] || die "Missing -s SIGNING_SECRET"
[[ -n "$cmd" ]] || die "Command required: challenge|message"

# Require jq for JSON assembly
command -v jq >/dev/null 2>&1 || die "jq is required (brew install jq)"

URL="${API_BASE%/}/slack/events/${ORG_CODE}"

case "$cmd" in
  challenge)
    # Simulate Slack URL verification
    CHALLENGE="$(openssl rand -hex 12)"
    BODY=$(jq -c --null-input --arg c "$CHALLENGE" '{ token: "test", challenge: $c, type: "url_verification" }')
    echo "POST $URL (url_verification)"
    sign_and_post "$BODY" "$URL" "$SIGNING_SECRET"
    ;;
  message)
    [[ -n "$text" ]] || text="Hello from slack-test.sh"
    now_ts="$(date +%s).000100"
    BODY=$(jq -c --null-input \
      --arg team "$TEAM" --arg user "$USER" --arg channel "$CHANNEL" --arg text "$text" --arg ts "$now_ts" '{
        token: "test",
        team_id: $team,
        api_app_id: "A000TEST",
        type: "event_callback",
        event_id: "Ev000TEST",
        event_time: (now|floor),
        event: {
          type: "message",
          user: $user,
          text: $text,
          ts: $ts,
          channel: $channel,
          channel_type: "channel"
        }
      }')
    echo "POST $URL (event_callback message)"
    sign_and_post "$BODY" "$URL" "$SIGNING_SECRET"
    ;;
  *) die "Unknown command: $cmd";;
esac

echo
echo "Tip: To list events (requires Authorization token), run:"
echo "  curl -H 'Authorization: Bearer <TOKEN>' '${API_BASE%/}/slack/events?limit=10' | jq"
