import { Router } from "express";

const validPlans = new Set(["starter", "plus", "family"]);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function normalizePlan(plan) {
  const normalized = String(plan || "starter").trim().toLowerCase();
  return validPlans.has(normalized) ? normalized : "";
}

function publicClient(client, { includeAccessUrl = false } = {}) {
  if (!client) return null;

  return {
    id: client.id,
    name: client.name,
    email: client.email,
    plan: client.plan,
    status: client.status,
    outlineKeyId: client.outlineKeyId,
    outlineKeyName: client.outlineKeyName,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    ...(includeAccessUrl ? { outlineAccessUrl: client.outlineAccessUrl } : {}),
  };
}

export function createClientsRouter({ db, outlineClient, config }) {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const clients = await db.listClients();
      res.json({ clients: clients.map((client) => publicClient(client)) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const client = await db.getClient(Number(req.params.id));
      if (!client) return res.status(404).json({ error: "Client not found" });
      res.json({ client: publicClient(client, { includeAccessUrl: true }) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const name = normalizeName(req.body?.name);
      const email = normalizeEmail(req.body?.email);
      const plan = normalizePlan(req.body?.plan);

      if (!name || !email || !email.includes("@") || !plan) {
        return res.status(400).json({
          error: "Valid name, email, and plan are required",
          validPlans: [...validPlans],
        });
      }

      const keyName = `${config.defaultKeyNamePrefix}-${email}`;
      const outlineKey = await outlineClient.createAccessKey({ name: keyName });
      let client;

      try {
        client = await db.createClient({
          name,
          email,
          plan,
          status: "active",
          outlineKeyId: outlineKey.id,
          outlineKeyName: outlineKey.name,
          outlineAccessUrl: outlineKey.accessUrl,
        });
      } catch (error) {
        await outlineClient.deleteAccessKey({ id: outlineKey.id }).catch(() => {});
        throw error;
      }

      res.status(201).json({
        client: publicClient(client, { includeAccessUrl: true }),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/revoke", async (req, res, next) => {
    try {
      const client = await db.getClient(Number(req.params.id));
      if (!client) return res.status(404).json({ error: "Client not found" });

      if (client.status !== "revoked") {
        await outlineClient.deleteAccessKey({ id: client.outlineKeyId });
      }

      const updatedClient = await db.updateClientStatus(client.id, "revoked");
      res.json({ client: publicClient(updatedClient) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/cancel", async (req, res, next) => {
    try {
      const client = await db.getClient(Number(req.params.id));
      if (!client) return res.status(404).json({ error: "Client not found" });

      if (client.status === "active") {
        await outlineClient.deleteAccessKey({ id: client.outlineKeyId });
      }

      const updatedClient = await db.updateClientStatus(client.id, "cancelled");
      res.json({ client: publicClient(updatedClient) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/rotate-key", async (req, res, next) => {
    try {
      const client = await db.getClient(Number(req.params.id));
      if (!client) return res.status(404).json({ error: "Client not found" });

      if (client.status === "cancelled") {
        return res.status(409).json({ error: "Cancelled clients cannot be rotated" });
      }

      const keyName = `${config.defaultKeyNamePrefix}-${client.email}-${Date.now()}`;
      const outlineKey = await outlineClient.createAccessKey({ name: keyName });

      try {
        if (client.status === "active") {
          await outlineClient.deleteAccessKey({ id: client.outlineKeyId });
        }

        const updatedClient = await db.updateClientKey(client.id, {
          outlineKeyId: outlineKey.id,
          outlineKeyName: outlineKey.name,
          outlineAccessUrl: outlineKey.accessUrl,
        });

        res.json({ client: publicClient(updatedClient, { includeAccessUrl: true }) });
      } catch (error) {
        await outlineClient.deleteAccessKey({ id: outlineKey.id }).catch(() => {});
        throw error;
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
}
