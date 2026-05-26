#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log() { printf '[setup] %s\n' "$*"; }
die() { printf '[setup] ERROR: %s\n' "$*" >&2; exit 1; }

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    die "Run this script as root on the Ubuntu VPS: sudo bash setup.sh"
  fi
}

detect_ubuntu() {
  . /etc/os-release
  [ "${ID:-}" = "ubuntu" ] || die "Ubuntu is required. Detected: ${ID:-unknown}"
  case "${VERSION_ID:-}" in
    22.04|24.04) ;;
    *) log "Ubuntu ${VERSION_ID:-unknown} detected. This kit is tested for 22.04 and should also work on 24.04." ;;
  esac
}

install_base_packages() {
  log "Installing base packages"
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
    ca-certificates curl gnupg lsb-release ufw fail2ban unattended-upgrades jq openssl
}

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker and Docker Compose plugin already installed"
    return
  fi

  log "Installing Docker Engine and Compose plugin"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu %s stable\n' \
    "$(dpkg --print-architecture)" "$VERSION_CODENAME" > /etc/apt/sources.list.d/docker.list
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
}

create_env() {
  if [ -f .env ]; then
    log ".env already exists; leaving it unchanged"
    return
  fi

  local public_ip
  public_ip="$(curl -fsS --max-time 10 https://api.ipify.org || true)"
  cp .env.example .env
  sed -i "s/^OUTLINE_HOSTNAME=.*/OUTLINE_HOSTNAME=${public_ip}/" .env
  sed -i "s#^OUTLINE_API_PREFIX=.*#OUTLINE_API_PREFIX=/$(openssl rand -hex 24)#" .env
  log "Created .env. Review OUTLINE_HOSTNAME and ADMIN_CIDR before production use."
}

create_state_and_cert() {
  log "Creating persisted-state directory and management TLS certificate"
  install -d -m 700 data/persisted-state exports backups
  if [ ! -f data/persisted-state/shadowbox-selfsigned.key ] || [ ! -f data/persisted-state/shadowbox-selfsigned.crt ]; then
    openssl req -x509 -newkey rsa:4096 -sha256 -days 825 -nodes \
      -keyout data/persisted-state/shadowbox-selfsigned.key \
      -out data/persisted-state/shadowbox-selfsigned.crt \
      -subj "/CN=outline-manager"
    chmod 600 data/persisted-state/shadowbox-selfsigned.key data/persisted-state/shadowbox-selfsigned.crt
  fi
}

configure_firewall() {
  # shellcheck disable=SC1091
  . ./.env
  local ssh_port="${SSH_PORT:-22}"
  local api_port="${OUTLINE_API_PORT:-8443}"
  local keys_port="${OUTLINE_KEYS_PORT:-443}"
  local admin_cidr="${ADMIN_CIDR:-}"

  log "Configuring ufw"
  ufw --force reset
  ufw default deny incoming
  ufw default allow outgoing

  if [ -n "$admin_cidr" ]; then
    ufw allow from "$admin_cidr" to any port "$ssh_port" proto tcp comment 'SSH from admin CIDR'
    ufw allow from "$admin_cidr" to any port "$api_port" proto tcp comment 'Outline management API from admin CIDR'
  else
    ufw allow "$ssh_port/tcp" comment 'SSH'
    ufw allow "$api_port/tcp" comment 'Outline management API'
  fi

  ufw allow "$keys_port/tcp" comment 'Outline access TCP'
  ufw allow "$keys_port/udp" comment 'Outline access UDP'

  if [ "${UFW_ALLOW_HTTP:-false}" = "true" ]; then
    ufw allow 80/tcp comment 'HTTP optional'
  fi

  ufw --force enable
}

configure_fail2ban() {
  log "Configuring fail2ban for sshd"
  cat >/etc/fail2ban/jail.d/sshd-local.conf <<'EOF'
[sshd]
enabled = true
mode = aggressive
maxretry = 5
findtime = 10m
bantime = 1h
EOF
  systemctl enable --now fail2ban
  systemctl restart fail2ban
}

configure_unattended_upgrades() {
  log "Enabling unattended security updates"
  dpkg-reconfigure -f noninteractive unattended-upgrades
  cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
}

main() {
  require_root
  detect_ubuntu
  install_base_packages
  install_docker
  create_env
  create_state_and_cert
  configure_firewall
  configure_fail2ban
  configure_unattended_upgrades
  log "Base setup complete. Run: sudo bash deploy.sh"
}

main "$@"
