import { Router } from "express";

const validPlans = new Set(["starter", "plus", "family", "launch"]);

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

function publicRequest(client) {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    plan: client.plan,
    status: client.status,
    createdAt: client.createdAt,
  };
}

export function createRequestsRouter({ db, emailService }) {
  const router = Router();

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

      const existingClient = await db.getClientByEmail(email);
      if (existingClient && existingClient.status !== "revoked") {
        return res.status(409).json({
          error: "A request already exists for this email",
          status: existingClient.status,
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

      const emailResults = await Promise.allSettled([
        emailService.sendRequestReceived(client),
        emailService.sendAdminNotification(client),
      ]);

      res.status(201).json({
        request: publicRequest(client),
        email: {
          customer: emailResults[0].status === "fulfilled" ? emailResults[0].value : { sent: false },
          admin: emailResults[1].status === "fulfilled" ? emailResults[1].value : { sent: false },
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
