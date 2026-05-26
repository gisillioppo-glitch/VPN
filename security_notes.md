# Security Notes

This kit is designed for legal self-hosted privacy. It is not a tool for bypassing institutional policy or hiding unauthorized activity.

## Secrets

Treat these as sensitive:

- `exports/outline_manager_access.txt`
- `exports/windows-client-1-access-url.txt`
- `exports/windows-client-1.json`
- `data/persisted-state/*`
- backup archives

Anyone with the Outline Manager config can administer the server. Anyone with a client access URL can use that access key.

## Firewall Model

Expose the fewest ports possible:

- SSH from your admin IP only
- management API from your admin IP only
- Outline access TCP/UDP on the chosen access port

Set `ADMIN_CIDR` in `.env` before production use. Example:

```text
ADMIN_CIDR=203.0.113.10/32
```

Then rerun:

```bash
sudo bash setup.sh
```

Be careful: setting the wrong admin CIDR can lock you out. Keep provider console access available.

## Updates

`update.sh` creates a backup before pulling the latest stable image and restarting. `install_cron.sh` schedules weekly updates and daily backups.

For a single-user privacy server, weekly updates are usually a good balance. For critical use, update manually when you can test the client afterward.

## Access Keys

Use separate keys for separate devices. Revoke lost or shared keys in Outline Manager.

Avoid posting access URLs in chats, tickets, screenshots, shell history, or public repositories.

## Logs

The scripts do not print generated client access URLs to stdout. They write sensitive data to `exports/` with mode `600` on Linux.

Docker logs may still contain operational details. Do not share full logs publicly without reviewing them.

## Cloud Security

On Oracle Cloud and similar providers, configure both:

- cloud security list or network security group
- host firewall with UFW

Provider-level firewalls are especially useful because blocked packets never reach the VPS.

## Limits

Outline provides encrypted proxy access, not anonymity by itself. Your VPS provider can observe server metadata such as bandwidth, uptime, and destination IPs leaving the VPS. Websites will see the VPS IP.

For sensitive work, combine this with good account security, HTTPS, software updates, and careful device hygiene.
