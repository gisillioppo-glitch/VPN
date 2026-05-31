#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log() { printf '[verify] %s\n' "$*"; }
fail() { printf '[verify] FAIL: %s\n' "$*" >&2; exit 1; }

[ -f .env ] || fail ".env missing"
# shellcheck disable=SC1091
. ./.env

OUTLINE_API_PORT="${OUTLINE_API_PORT:-8443}"
OUTLINE_KEYS_PORT="${OUTLINE_KEYS_PORT:-443}"

docker compose ps
docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' outline-server

ss -lntup | grep -E ":(${OUTLINE_API_PORT}|${OUTLINE_KEYS_PORT})\\b" || fail "Expected Outline ports are not listening"
ufw status verbose

if docker exec outline-server sh -c 'test -f /opt/outline/persisted-state/shadowbox_server_config.json || test -f /root/shadowbox/persisted-state/shadowbox_server_config.json'; then
  log "Outline persisted state exists"
else
  fail "Outline persisted state missing"
fi

if [ -n "${OUTLINE_API_PREFIX:-}" ]; then
  OUTLINE_API_PREFIX="$(printf '%s' "$OUTLINE_API_PREFIX" | sed 's#^/*##')"
  api_ready=false
  for i in $(seq 1 30); do
    if curl -g -fsSk "https://[::1]:${OUTLINE_API_PORT}/${OUTLINE_API_PREFIX}/server" >/dev/null 2>&1; then
      api_ready=true
      break
    fi
    sleep 2
  done
  if [ "$api_ready" = "true" ]; then
    log "Management API responded"
  else
    log "Management API check failed locally after waiting; inspect Docker logs"
  fi
fi

log "Verification complete"
