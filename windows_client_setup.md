# Windows Client Setup

Use the official Outline Client for Windows.

## Install

1. Download Outline Client from the official Outline site or Microsoft Store.
2. Open the app.
3. Choose `Add server`.
4. Paste the access URL from:

```text
exports/windows-client-1-access-url.txt
```

5. Connect and test browsing.

If that file was not created, open Outline Manager on your Windows laptop, paste the admin config from `exports/outline_manager_access.txt`, create a new access key, then copy it into Outline Client.

## Recommended Windows Settings

- Keep Outline Client updated.
- Keep Windows DNS settings simple unless you have a known reason to customize them.
- Avoid stacking multiple VPNs, proxies, or security clients at the same time.
- If your school or employer manages the device or network, follow their acceptable-use policy.

## Quick Tests

After connecting:

```powershell
curl.exe https://ifconfig.me
nslookup example.com
```

The IP should show the VPS public IP. DNS lookup should succeed quickly.

## When It Fails

Try these in order:

1. Disconnect and reconnect in Outline Client.
2. Test from a mobile hotspot to separate server problems from managed-network policy.
3. Confirm `sudo bash verify.sh` passes on the server.
4. Confirm the VPS cloud firewall allows TCP and UDP on the access port.
5. Create a fresh access key in Outline Manager.
