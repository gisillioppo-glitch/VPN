import express from "express";
import helmet from "helmet";
import { getConfig } from "./config.js";
import { openDatabase } from "./database.js";
import { requireAdminToken } from "./middleware/auth.js";
import { OutlineClient } from "./outlineClient.js";
import { createClientsRouter } from "./routes/clients.js";
import { createHealthRouter } from "./routes/health.js";
import { createKeysRouter } from "./routes/keys.js";

const config = getConfig();
const outlineClient = new OutlineClient({ apiUrl: config.outlineApiUrl });
const db = await openDatabase({ dbPath: config.dbPath });
const authMiddleware = requireAdminToken(config);
const app = express();

app.use(helmet());
app.use(express.json({ limit: "32kb" }));

app.get("/", (_req, res) => {
  res.json({
    service: "orbit-outline-backend",
    status: "ok",
    docs: "/health",
  });
});

app.use("/health", createHealthRouter({ outlineClient, authMiddleware }));
app.use("/api/keys", authMiddleware, createKeysRouter({ outlineClient, config }));
app.use("/api/clients", authMiddleware, createClientsRouter({ db, outlineClient, config }));

app.use((error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message.includes("SQLITE_CONSTRAINT")) {
    return res.status(409).json({ error: "Record already exists" });
  }
  return res.status(500).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`ORBIT backend listening on http://127.0.0.1:${config.port}`);
});
