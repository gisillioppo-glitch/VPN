export function getConfig() {
  const required = ["ADMIN_TOKEN", "OUTLINE_API_URL"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    port: Number(process.env.PORT || 8787),
    adminToken: process.env.ADMIN_TOKEN,
    outlineApiUrl: process.env.OUTLINE_API_URL.replace(/\/+$/, ""),
    outlineCertSha256: process.env.OUTLINE_CERT_SHA256 || "",
    defaultKeyNamePrefix: process.env.DEFAULT_KEY_NAME_PREFIX || "orbit-client",
  };
}
