#!/usr/bin/env bash
# Translate a local .env file into AWS SSM Parameter Store or AWS Secrets Manager
#
# Usage examples:
#   scripts/dotenv-to-aws.sh \
#     --file .env \
#     --service ssm \
#     --prefix /avnzr \
#     --region us-east-1 \
#     --overwrite \
#     --yes
#
#   scripts/dotenv-to-aws.sh \
#     --file .env.staging \
#     --service secretsmanager \
#     --prefix /avnzr-staging \
#     --region us-east-1 \
#     --yes
#
# Notes
# - Requires AWS CLI configured (or environment variables for credentials)
# - Never commit .env; this script is for one-time import/migration

set -euo pipefail

FILE=".env"
SERVICE="ssm"            # ssm | secretsmanager
PREFIX="/avnzr"
REGION=""
KMS_KEY_ID=""            # optional (for SSM SecureString)
OVERWRITE=false
LOWERCASE_KEYS=false
CONFIRM=false

function usage() {
  cat <<EOF
Translate a .env file into AWS SSM or Secrets Manager (one key per parameter/secret).

Options:
  --file <path>            Path to .env (default: .env)
  --service <ssm|secretsmanager>  Target service (default: ssm)
  --prefix <path>          Parameter/Secret name prefix (default: /avnzr)
  --region <aws-region>    AWS region (if not using default profile/region)
  --kms-key-id <arn>       SSM KMS KeyId for SecureString (optional)
  --overwrite              Overwrite existing parameters (SSM only)
  --lowercase-keys         Convert keys to lowercase in names
  --yes                    No confirmation prompt
  -h, --help               Show help

Examples:
  scripts/dotenv-to-aws.sh --file .env --service ssm --prefix /avnzr --region us-east-1 --overwrite --yes
  scripts/dotenv-to-aws.sh --file .env.staging --service secretsmanager --prefix /avnzr-staging --region us-east-1 --yes
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file) FILE="$2"; shift 2 ;;
    --service) SERVICE="$2"; shift 2 ;;
    --prefix) PREFIX="$2"; shift 2 ;;
    --region) REGION="$2"; shift 2 ;;
    --kms-key-id) KMS_KEY_ID="$2"; shift 2 ;;
    --overwrite) OVERWRITE=true; shift 1 ;;
    --lowercase-keys) LOWERCASE_KEYS=true; shift 1 ;;
    --yes) CONFIRM=true; shift 1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ ! -f "$FILE" ]]; then
  echo "Error: file not found: $FILE" >&2
  exit 1
fi

if [[ "$SERVICE" != "ssm" && "$SERVICE" != "secretsmanager" ]]; then
  echo "Error: --service must be 'ssm' or 'secretsmanager'" >&2
  exit 1
fi

if [[ -n "$REGION" ]]; then
  AWS_REGION="$REGION"
  export AWS_REGION
fi

echo "Planned import:"
echo "  File     : $FILE"
echo "  Service  : $SERVICE"
echo "  Prefix   : $PREFIX"
echo "  Region   : ${AWS_REGION:-'(default)'}"
echo "  Overwrite: $OVERWRITE"
echo "  Lowercase: $LOWERCASE_KEYS"

if [[ "$CONFIRM" != true ]]; then
  read -r -p "Proceed? [y/N] " ans
  [[ "$ans" == "y" || "$ans" == "Y" ]] || { echo "Aborted."; exit 1; }
fi

function trim() { sed -e 's/^\s*//' -e 's/\s*$//'; }
function strip_quotes() { sed -e "s/^'\(.*\)'$/\1/" -e 's/^"\(.*\)"$/\1/'; }

count=0
while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip comments and blank lines
  [[ -z "$line" ]] && continue
  [[ "$line" =~ ^\s*# ]] && continue
  # Accept lines like 'export KEY=VALUE'
  line="${line#export }"
  # Split on first '=' only
  key="${line%%=*}"; val="${line#*=}"
  key="$(echo "$key" | trim)"
  val="$(echo "$val" | trim | strip_quotes)"
  [[ -z "$key" ]] && continue
  # Skip NEXT_PUBLIC_ if desired? (we still import them; callers can filter)

  name="$key"
  if [[ "$LOWERCASE_KEYS" == true ]]; then
    name="$(echo "$name" | tr '[:upper:]' '[:lower:]')"
  fi
  full_name="${PREFIX%/}/$name"

  if [[ "$SERVICE" == "ssm" ]]; then
    args=(--name "$full_name" --type SecureString --value "$val")
    [[ "$OVERWRITE" == true ]] && args+=(--overwrite)
    [[ -n "$KMS_KEY_ID" ]] && args+=(--key-id "$KMS_KEY_ID")
    aws ssm put-parameter "${args[@]}"
  else
    # Secrets Manager: create if missing, otherwise put new version
    if aws secretsmanager describe-secret --secret-id "$full_name" >/dev/null 2>&1; then
      aws secretsmanager put-secret-value --secret-id "$full_name" --secret-string "$val" >/dev/null
    else
      aws secretsmanager create-secret --name "$full_name" --secret-string "$val" >/dev/null
    fi
  fi
  ((count++))
done < "$FILE"

echo "Imported $count entries to $SERVICE under prefix $PREFIX"

