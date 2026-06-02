#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="${SERVICE_NAME:-orbit-backend}"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
RUN_USER="${RUN_USER:-ubuntu}"
RUN_GROUP="${RUN_GROUP:-ubuntu}"

log() { printf '[orbit-backend] %s\n' "$*"; }
die() { printf '[orbit-backend] ERROR: %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root: sudo bash backend/install_systemd.sh"
[ -f "${APP_DIR}/.env" ] || die "${APP_DIR}/.env is missing"
[ -f "${APP_DIR}/src/server.js" ] || die "Backend server entrypoint missing"
command -v node >/dev/null 2>&1 || die "node is not installed"

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=ORBIT Outline Backend
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=$(command -v node) ${APP_DIR}/src/server.js
Restart=on-failure
RestartSec=5
User=${RUN_USER}
Group=${RUN_GROUP}
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=${APP_DIR}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"
systemctl status "$SERVICE_NAME" --no-pager
log "Installed ${SERVICE_FILE}"
