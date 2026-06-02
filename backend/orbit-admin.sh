#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${ORBIT_BACKEND_URL:-http://127.0.0.1:8787}"
ENV_FILE="${ORBIT_BACKEND_ENV:-/opt/outline-kit/backend/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  echo "ADMIN_TOKEN is not set. Source backend/.env or set ORBIT_BACKEND_ENV." >&2
  exit 1
fi

request() {
  local method="$1"
  local path="$2"
  curl -s -X "$method" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    "${BASE_URL}${path}" | jq
}

usage() {
  cat <<'EOF'
ORBIT admin helper

Usage:
  bash backend/orbit-admin.sh list
  bash backend/orbit-admin.sh pending
  bash backend/orbit-admin.sh approve CLIENT_ID
  bash backend/orbit-admin.sh suspend CLIENT_ID
  bash backend/orbit-admin.sh revoke CLIENT_ID
  bash backend/orbit-admin.sh keys

Never paste access URLs in public chats or screenshots.
EOF
}

command="${1:-}"
case "$command" in
  list)
    request GET "/api/clients"
    ;;
  pending)
    curl -s -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      "${BASE_URL}/api/clients" | jq '.clients[] | select(.status=="pending")'
    ;;
  approve)
    [[ -n "${2:-}" ]] || { usage; exit 1; }
    request POST "/api/clients/${2}/approve"
    ;;
  suspend)
    [[ -n "${2:-}" ]] || { usage; exit 1; }
    request POST "/api/clients/${2}/suspend"
    ;;
  revoke)
    [[ -n "${2:-}" ]] || { usage; exit 1; }
    request POST "/api/clients/${2}/revoke"
    ;;
  keys)
    curl -s -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      "${BASE_URL}/api/keys" | jq '.accessKeys[] | {id, name, port}'
    ;;
  *)
    usage
    exit 1
    ;;
esac
