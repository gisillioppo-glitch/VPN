import { Router } from "express";

export function createHealthRouter({ outlineClient, authMiddleware }) {
  const router = Router();

  router.get("/", async (_req, res) => {
    res.json({ status: "ok", service: "orbit-outline-backend" });
  });

  router.get("/outline", authMiddleware, async (_req, res, next) => {
    try {
      const server = await outlineClient.getServer();
      res.json({
        status: "ok",
        outline: {
          name: server.name,
          version: server.version,
          hostnameForAccessKeys: server.hostnameForAccessKeys,
          portForNewAccessKeys: server.portForNewAccessKeys,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
