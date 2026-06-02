import { Router } from "express";

const validPlans = new Set(["starter", "plus", "family", "launch"]);
const activeStatuses = new Set(["active", "approved"]);

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

async function deleteClientKeyIfPresent(outlineClient, client) {
  if (!client.outlineKeyId) return;
  await outlineClient.deleteAccessKey({ id: client.outlineKeyId }).catch(() => {});
}

export function createClientsRouter({ db, outlineClient, config, emailService }) {
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

      const client = await db.createClient({
        name,
        email,
        plan,
        status: "pending",
        outlineKeyId: null,
        outlineKeyName: null,
        outlineAccessUrl: null,
      });

      res.status(201).json({
        client: publicClient(client),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/approve", async (req, res, next) => {
    try {
      const client = await db.getClient(Number(req.params.id));
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (client.status === "revoked") {
        return res.status(409).json({ error: "Revoked clients cannot be approved" });
      }
      if (activeStatuses.has(client.status) && client.outlineKeyId) {
        return res.json({ client: publicClient(client, { includeAccessUrl: true }) });
      }

      const keyName = `${config.defaultKeyNamePrefix}-${client.email}-${Date.now()}`;
      const outlineKey = await outlineClient.createAccessKey({ name: keyName });

      try {
        const updatedClient = await db.updateClientKey(client.id, {
          outlineKeyId: outlineKey.id,
          outlineKeyName: outlineKey.name,
          outlineAccessUrl: outlineKey.accessUrl,
        });

        const emailResult = await emailService.sendAccessApproved(updatedClient).catch((error) => ({
          sent: false,
          error: error.message,
        }));

        res.json({
          client: publicClient(updatedClient, { includeAccessUrl: true }),
          email: emailResult,
        });
      } catch (error) {
        await outlineClient.deleteAccessKey({ id: outlineKey.id }).catch(() => {});
        throw error;
      }
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/revoke", async (req, res, next) => {
    try {
      const client = await db.getClient(Number(req.params.id));
      if (!client) return res.status(404).json({ error: "Client not found" });

      if (client.status !== "revoked" && client.outlineKeyId) {
        await deleteClientKeyIfPresent(outlineClient, client);
      }

      const updatedClient = await db.clearClientKey(client.id, "revoked");
      res.json({ client: publicClient(updatedClient) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/suspend", async (req, res, next) => {
    try {
      const client = await db.getClient(Number(req.params.id));
      if (!client) return res.status(404).json({ error: "Client not found" });

      if (activeStatuses.has(client.status) && client.outlineKeyId) {
        await deleteClientKeyIfPresent(outlineClient, client);
      }

      const updatedClient = await db.clearClientKey(client.id, "suspended");
      res.json({ client: publicClient(updatedClient) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/cancel", async (req, res, next) => {
    try {
      const client = await db.getClient(Number(req.params.id));
      if (!client) return res.status(404).json({ error: "Client not found" });

      if (activeStatuses.has(client.status) && client.outlineKeyId) {
        await deleteClientKeyIfPresent(outlineClient, client);
      }

      const updatedClient = await db.clearClientKey(client.id, "suspended");
      res.json({ client: publicClient(updatedClient) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/rotate-key", async (req, res, next) => {
    try {
      const client = await db.getClient(Number(req.params.id));
      if (!client) return res.status(404).json({ error: "Client not found" });

      if (client.status === "revoked" || client.status === "suspended") {
        return res.status(409).json({ error: "Suspended or revoked clients cannot be rotated" });
      }

      const keyName = `${config.defaultKeyNamePrefix}-${client.email}-${Date.now()}`;
      const outlineKey = await outlineClient.createAccessKey({ name: keyName });

      try {
        if (activeStatuses.has(client.status) && client.outlineKeyId) {
          await deleteClientKeyIfPresent(outlineClient, client);
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
