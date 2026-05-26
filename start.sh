#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

case "${1:-start}" in
  start)
    docker compose up -d
    bash ./verify.sh
    ;;
  stop)
    docker compose stop
    ;;
  restart)
    docker compose restart
    bash ./verify.sh
    ;;
  status)
    docker compose ps
    ;;
  *)
    echo "Usage: sudo bash start.sh [start|stop|restart|status]" >&2
    exit 2
    ;;
esac
