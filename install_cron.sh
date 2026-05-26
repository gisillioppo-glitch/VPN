#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

[ "$(id -u)" -eq 0 ] || { echo "Run as root: sudo bash install_cron.sh" >&2; exit 1; }

cat >/etc/cron.d/outline-maintenance <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
17 3 * * * root cd "$SCRIPT_DIR" && bash backup.sh >/var/log/outline-backup.log 2>&1
42 4 * * 0 root cd "$SCRIPT_DIR" && bash update.sh >/var/log/outline-update.log 2>&1
EOF

chmod 644 /etc/cron.d/outline-maintenance
echo "[cron] Installed /etc/cron.d/outline-maintenance"
