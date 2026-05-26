#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

printf '[update] Creating pre-update backup\n'
bash ./backup.sh

printf '[update] Pulling latest stable image and restarting\n'
docker compose pull
docker compose up -d

printf '[update] Pruning unused Docker images\n'
docker image prune -f

bash ./verify.sh
printf '[update] Update complete\n'
