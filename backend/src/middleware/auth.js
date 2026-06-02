export function requireAdminToken(config) {
  return (req, res, next) => {
    const header = req.get("Authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

    if (!token || token !== config.adminToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return next();
  };
}
