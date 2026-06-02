import { Router } from "express";

function sanitizeKey(key) {
  return {
    id: key.id,
    name: key.name,
    port: key.port,
    method: key.method,
    accessUrl: key.accessUrl,
  };
}

export function createKeysRouter({ outlineClient, config }) {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const result = await outlineClient.listAccessKeys();
      res.json({
        accessKeys: (result.accessKeys || []).map(sanitizeKey),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const requestedName = String(req.body?.name || "").trim();
      const name =
        requestedName ||
        `${config.defaultKeyNamePrefix}-${new Date().toISOString().replace(/[:.]/g, "-")}`;

      const key = await outlineClient.createAccessKey({ name });
      res.status(201).json({ accessKey: sanitizeKey(key) });
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id/name", async (req, res, next) => {
    try {
      const id = String(req.params.id || "").trim();
      const name = String(req.body?.name || "").trim();

      if (!id || !name) {
        return res.status(400).json({ error: "Both id and name are required" });
      }

      await outlineClient.renameAccessKey({ id, name });
      res.json({ status: "renamed", id, name });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const id = String(req.params.id || "").trim();

      if (!id) {
        return res.status(400).json({ error: "id is required" });
      }

      await outlineClient.deleteAccessKey({ id });
      res.json({ status: "revoked", id });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
