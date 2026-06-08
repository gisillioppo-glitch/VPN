# ORBIT Sentinel Architecture

ORBIT Sentinel is a private zero-trust visibility layer for personal devices.
It does not replace antivirus, the operating system firewall, or ORBIT VPN.
Its first job is simple: know which devices are trusted, receive security events,
score risk, and alert the owner when something unusual happens.

## Product Principle

> The best door is the one that does not exist.

Sentinel reduces unnecessary exposure, records what matters, and makes suspicious
activity visible quickly. The system must stay defensive, transparent, and
authorized. It must not hide malware, bypass controls, intercept third-party
traffic, or collect data from devices without clear owner consent.

## MVP Scope

The first version is designed for one owner and a small number of personal
devices.

Included:

- Private device inventory.
- Device-specific authentication token.
- Device status: `pending`, `trusted`, or `blocked`.
- Event ingestion from approved local agents.
- Severity levels: `informational`, `suspicious`, and `critical`.
- Basic trust score.
- Admin-only event timeline.
- Foundation for later email/mobile alerts.

Not included yet:

- Antivirus or malware removal.
- Kernel drivers.
- Network packet capture.
- Browser history scraping.
- Enterprise SSO.
- Multi-tenant commercial operations.

## System Shape

```text
Windows device
  -> Sentinel agent
  -> ORBIT backend /api/sentinel/events
  -> SQLite event store
  -> Trust score update
  -> Admin dashboard and future alerts
```

The Sentinel API runs inside the existing ORBIT backend. During the private MVP,
the backend should stay bound to `127.0.0.1` on the server and only be reached
through SSH, a private tunnel, or another explicitly approved access layer.

## Data Model

### sentinel_devices

Each enrolled computer gets one row.

- `id`: internal device id.
- `name`: friendly device name.
- `owner`: owner label or email.
- `platform`: Windows, macOS, Linux, etc.
- `device_fingerprint`: optional hardware/software fingerprint.
- `status`: `pending`, `trusted`, or `blocked`.
- `trust_score`: 0 to 100.
- `token_hash`: SHA-256 hash of the device token.
- `last_seen_at`: latest event timestamp.
- `created_at` / `updated_at`: audit timestamps.

The raw device token is only shown once when the device is created.

### sentinel_events

Each security-relevant observation gets one row.

- `device_id`: reporting device.
- `severity`: `informational`, `suspicious`, or `critical`.
- `event_type`: short machine-readable category.
- `summary`: human-readable event summary.
- `source_ip`: server-observed source IP.
- `details_json`: bounded JSON details.
- `created_at`: event timestamp.

## Trust Score

The first scoring model is intentionally simple:

- `informational`: no score change.
- `suspicious`: -10.
- `critical`: -25.

This is not meant to be magic AI. It is a practical early warning number. More
signals can be added after the Windows agent produces real data.

## API Surface

Admin endpoints require `Authorization: Bearer $ADMIN_TOKEN`.

```text
GET  /api/sentinel/devices
POST /api/sentinel/devices
POST /api/sentinel/devices/:id/trust
POST /api/sentinel/devices/:id/block
GET  /api/sentinel/events
```

Device ingestion uses device credentials:

```text
POST /api/sentinel/events
X-Sentinel-Device-Id: DEVICE_ID
X-Sentinel-Device-Token: DEVICE_TOKEN
```

## Security Rules

- Do not expose Sentinel publicly without HTTPS and a deliberate access layer.
- Do not commit device tokens, admin tokens, access URLs, or local databases.
- Use one token per device.
- Rotate a device token by creating a new device record and blocking the old one
  until a proper rotation endpoint exists.
- Keep event details small and avoid storing secrets.
- Treat `critical` events as owner-action-required.

## First Agent Events

The Windows agent should start with low-risk telemetry:

- Agent started.
- VPN appears connected or disconnected.
- Public IP changed.
- Device boot/login observed.
- Windows Defender status changed.
- Firewall status changed.
- New local administrator detected.
- Suspicious process name matched a local rule.

The agent must not read private messages, browser sessions, passwords, or files.

## Next Blocks

1. Add a small admin helper command for Sentinel.
2. Build a Windows PowerShell collector script.
3. Add email alerts for `critical` events.
4. Add a private dashboard view.
5. Add token rotation and event export.
