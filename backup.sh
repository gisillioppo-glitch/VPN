#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="$BACKUP_DIR/outline-backup-$STAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

tar -czf "$ARCHIVE" -C "$SCRIPT_DIR" data/persisted-state exports

chmod 600 "$ARCHIVE"
printf '[backup] Created %s\n' "$ARCHIVE"
