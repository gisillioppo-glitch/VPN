import crypto from "node:crypto";
import express from "express";

const VALID_STATUSES = new Set(["pending", "trusted", "blocked"]);
const VALID_SEVERITIES = new Set(["informational", "suspicious", "critical"]);

function hashToken(token) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function generateDeviceToken() {
  return crypto.randomBytes(32).toString("hex");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left || "", "hex");
  const rightBuffer = Buffer.from(right || "", "hex");

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeEvent(row) {
  if (!row) return row;

  return {
    ...row,
    details: JSON.parse(row.detailsJson || "{}"),
    detailsJson: undefined,
  };
}

function getSourceIp(req) {
  const forwardedFor = req.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.socket.remoteAddress || "";
}

async function requireDeviceToken(req, res, next) {
  try {
    const deviceId = Number(req.get("X-Sentinel-Device-Id") || "");
    const deviceToken = req.get("X-Sentinel-Device-Token") || "";

    if (!deviceId || !deviceToken) {
      return res.status(401).json({ error: "Missing device credentials" });
    }

    const device = await req.sentinelDb.getSentinelDeviceAuth(deviceId);
    if (!device || !safeEqual(hashToken(deviceToken), device.tokenHash)) {
      return res.status(401).json({ error: "Invalid device credentials" });
    }

    if (device.status === "blocked") {
      return res.status(403).json({ error: "Device is blocked" });
    }

    req.sentinelDevice = device;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function createSentinelRouter({ db, authMiddleware }) {
  const router = express.Router();

  router.use((req, _res, next) => {
    req.sentinelDb = db;
    next();
  });

  router.get("/devices", authMiddleware, async (_req, res, next) => {
    try {
      const devices = await db.listSentinelDevices();
      res.json({ devices });
    } catch (error) {
      next(error);
    }
  });

  router.post("/devices", authMiddleware, async (req, res, next) => {
    try {
      const name = String(req.body.name || "").trim();
      const owner = String(req.body.owner || "").trim();
      const platform = String(req.body.platform || "").trim();
      const deviceFingerprint = String(req.body.deviceFingerprint || "").trim();
      const status = String(req.body.status || "pending").trim();

      if (!name || !owner || !platform) {
        return res.status(400).json({ error: "name, owner, and platform are required" });
      }
      if (!VALID_STATUSES.has(status)) {
        return res.status(400).json({ error: "Invalid device status" });
      }

      const deviceToken = generateDeviceToken();
      const device = await db.createSentinelDevice({
        name,
        owner,
        platform,
        deviceFingerprint,
        status,
        tokenHash: hashToken(deviceToken),
      });

      res.status(201).json({
        device,
        deviceToken,
        warning: "Store this token now. It is not shown again.",
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/devices/:id/trust", authMiddleware, async (req, res, next) => {
    try {
      const device = await db.updateSentinelDeviceStatus(req.params.id, "trusted");
      if (!device) return res.status(404).json({ error: "Device not found" });
      return res.json({ device });
    } catch (error) {
      next(error);
    }
  });

  router.post("/devices/:id/block", authMiddleware, async (req, res, next) => {
    try {
      const device = await db.updateSentinelDeviceStatus(req.params.id, "blocked");
      if (!device) return res.status(404).json({ error: "Device not found" });
      return res.json({ device });
    } catch (error) {
      next(error);
    }
  });

  router.get("/events", authMiddleware, async (req, res, next) => {
    try {
      const events = await db.listSentinelEvents({
        deviceId: req.query.deviceId,
        severity: req.query.severity,
        limit: req.query.limit,
      });
      res.json({ events: events.map(normalizeEvent) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/events", requireDeviceToken, async (req, res, next) => {
    try {
      const severity = String(req.body.severity || "informational").trim();
      const eventType = String(req.body.eventType || "").trim();
      const summary = String(req.body.summary || "").trim();
      const details = req.body.details && typeof req.body.details === "object"
        ? req.body.details
        : {};

      if (!VALID_SEVERITIES.has(severity)) {
        return res.status(400).json({ error: "Invalid event severity" });
      }
      if (!eventType || !summary) {
        return res.status(400).json({ error: "eventType and summary are required" });
      }

      const event = await db.recordSentinelEvent({
        deviceId: req.sentinelDevice.id,
        severity,
        eventType,
        summary,
        sourceIp: getSourceIp(req),
        details,
      });

      res.status(201).json({ event: normalizeEvent(event) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
