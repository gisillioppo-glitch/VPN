export function getConfig() {
  const required = ["ADMIN_TOKEN", "OUTLINE_API_URL"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    port: Number(process.env.PORT || 8787),
    adminToken: process.env.ADMIN_TOKEN,
    dbPath: process.env.DB_PATH || "./data/orbit.db",
    outlineApiUrl: process.env.OUTLINE_API_URL.replace(/\/+$/, ""),
    outlineCertSha256: process.env.OUTLINE_CERT_SHA256 || "",
    defaultKeyNamePrefix: process.env.DEFAULT_KEY_NAME_PREFIX || "orbit-client",
    publicPortalOrigin: process.env.PUBLIC_PORTAL_ORIGIN || "",
    brandName: process.env.BRAND_NAME || "ORBIT VPN",
    supportEmail: process.env.SUPPORT_EMAIL || "hello@orbitvpn.co",
    resendApiKey: process.env.RESEND_API_KEY || "",
    emailFrom: process.env.EMAIL_FROM || "",
    adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL || "",
    sentinelAlertEmail: process.env.SENTINEL_ALERT_EMAIL || process.env.ADMIN_NOTIFY_EMAIL || "",
    sentinelAlertSeverities: (process.env.SENTINEL_ALERT_SEVERITIES || "critical")
      .split(",")
      .map((severity) => severity.trim())
      .filter(Boolean),
    sentinelAlertCooldownMs: Number(process.env.SENTINEL_ALERT_COOLDOWN_MS || 15 * 60 * 1000),
    publicRequestWindowMs: Number(process.env.PUBLIC_REQUEST_WINDOW_MS || 60 * 60 * 1000),
    publicRequestMaxPerWindow: Number(process.env.PUBLIC_REQUEST_MAX_PER_WINDOW || 5),
  };
}
