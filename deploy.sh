#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log() { printf '[deploy] %s\n' "$*"; }
die() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root: sudo bash deploy.sh"
[ -f .env ] || die ".env missing. Run sudo bash setup.sh first."

# shellcheck disable=SC1091
. ./.env

OUTLINE_API_PORT="${OUTLINE_API_PORT:-8443}"
OUTLINE_KEYS_PORT="${OUTLINE_KEYS_PORT:-443}"
OUTLINE_HOSTNAME="${OUTLINE_HOSTNAME:-}"
OUTLINE_API_PREFIX="${OUTLINE_API_PREFIX:-}"

if [ -z "$OUTLINE_API_PREFIX" ]; then
  OUTLINE_API_PREFIX="$(openssl rand -hex 24)"
  if grep -q '^OUTLINE_API_PREFIX=' .env; then
    sed -i "s#^OUTLINE_API_PREFIX=.*#OUTLINE_API_PREFIX=${OUTLINE_API_PREFIX}#" .env
  else
    printf '\nOUTLINE_API_PREFIX=%s\n' "$OUTLINE_API_PREFIX" >> .env
  fi
elif printf '%s' "$OUTLINE_API_PREFIX" | grep -q '^/'; then
  OUTLINE_API_PREFIX="$(printf '%s' "$OUTLINE_API_PREFIX" | sed 's#^/*##')"
  sed -i "s#^OUTLINE_API_PREFIX=.*#OUTLINE_API_PREFIX=${OUTLINE_API_PREFIX}#" .env
  log "Normalized OUTLINE_API_PREFIX without a leading slash"
fi

if [ -z "$OUTLINE_HOSTNAME" ]; then
  OUTLINE_HOSTNAME="$(curl -fsS --max-time 10 https://api.ipify.org || true)"
  [ -n "$OUTLINE_HOSTNAME" ] || die "Could not determine public IP. Set OUTLINE_HOSTNAME in .env."
  sed -i "s/^OUTLINE_HOSTNAME=.*/OUTLINE_HOSTNAME=${OUTLINE_HOSTNAME}/" .env
fi

log "Starting Outline container"
docker compose pull
docker compose up -d --force-recreate

log "Waiting for Outline state"
for i in $(seq 1 30); do
  if docker exec outline-server sh -c 'test -f /opt/outline/persisted-state/shadowbox_server_config.json || test -f /root/shadowbox/persisted-state/shadowbox_server_config.json'; then
    break
  fi
  sleep 2
  [ "$i" -lt 30 ] || die "Outline did not create persisted config in time."
done

mkdir -p exports backups
docker exec outline-server sh -c 'cat /opt/outline/persisted-state/shadowbox_server_config.json 2>/dev/null || cat /root/shadowbox/persisted-state/shadowbox_server_config.json' > exports/shadowbox_server_config.json
chmod 600 exports/shadowbox_server_config.json

api_cert_sha256="$(openssl x509 -in data/persisted-state/shadowbox-selfsigned.crt -noout -fingerprint -sha256 | cut -d= -f2 | tr -d ':')"
public_api_url="https://${OUTLINE_HOSTNAME}:${OUTLINE_API_PORT}/${OUTLINE_API_PREFIX}"
local_api_url="https://[::1]:${OUTLINE_API_PORT}/${OUTLINE_API_PREFIX}"

log "Waiting for Outline management API"
for i in $(seq 1 60); do
  if curl -g -fsSk "${local_api_url}/server" >/dev/null 2>&1; then
    break
  fi
  sleep 2
  [ "$i" -lt 60 ] || die "Outline management API did not become ready in time."
done

cat > exports/outline_manager_access.txt <<EOF
Paste this into Outline Manager:
{"apiUrl":"${public_api_url}","certSha256":"${api_cert_sha256}"}

Keep this file private. It allows administration of this Outline server.
EOF
chmod 600 exports/outline_manager_access.txt

log "Setting server hostname, default access-key port, and display name"
curl -g -fsSk -X PUT "${local_api_url}/server/hostname-for-access-keys" \
  -H 'Content-Type: application/json' \
  -d "$(jq -cn --arg hostname "$OUTLINE_HOSTNAME" '{hostname:$hostname}')" >/dev/null || log "Could not set hostname through API"
curl -g -fsSk -X PUT "${local_api_url}/server/port-for-new-access-keys" \
  -H 'Content-Type: application/json' \
  -d "$(jq -cn --argjson port "$OUTLINE_KEYS_PORT" '{port:$port}')" >/dev/null || log "Could not set default access-key port through API"
curl -g -fsSk -X PUT "${local_api_url}/name" \
  -H 'Content-Type: application/json' \
  -d "$(jq -cn --arg name "${OUTLINE_SERVER_NAME:-self-hosted-outline}" '{name:$name}')" >/dev/null || log "Could not set server name through API"

log "Creating a default client access key"
access_key_json="$(curl -g -fsSk -X POST "${local_api_url}/access-keys" -H 'Content-Type: application/json' -d '{"name":"windows-client-1"}' || true)"
if [ -n "$access_key_json" ] && printf '%s' "$access_key_json" | jq -e '.accessUrl' >/dev/null 2>&1; then
  printf '%s\n' "$access_key_json" > exports/windows-client-1.json
  jq -r '.accessUrl' exports/windows-client-1.json > exports/windows-client-1-access-url.txt
  chmod 600 exports/windows-client-1.json exports/windows-client-1-access-url.txt
  log "Client access URL exported to exports/windows-client-1-access-url.txt"
else
  log "Could not create access key through API yet. Use Outline Manager with exports/outline_manager_access.txt."
fi

log "Running verification"
bash ./verify.sh

log "Deployment complete. Manager access file: exports/outline_manager_access.txt"
