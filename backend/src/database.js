import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";

sqlite3.verbose();

function resolveDbPath(dbPath) {
  return path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) return reject(error);
      return resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) return reject(error);
      return resolve(rows);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) return reject(error);
      return resolve(row);
    });
  });
}

export async function openDatabase({ dbPath }) {
  const resolvedPath = resolveDbPath(dbPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const db = await new Promise((resolve, reject) => {
    const connection = new sqlite3.Database(resolvedPath, (error) => {
      if (error) return reject(error);
      return resolve(connection);
    });
  });

  await run(db, "PRAGMA journal_mode = WAL");
  await run(db, "PRAGMA foreign_keys = ON");
  await migrate(db);

  return {
    createClient: (client) => createClient(db, client),
    listClients: () => listClients(db),
    getClient: (id) => getClient(db, id),
    getClientByEmail: (email) => getClientByEmail(db, email),
    updateClientStatus: (id, status) => updateClientStatus(db, id, status),
    updateClientKey: (id, key) => updateClientKey(db, id, key),
    clearClientKey: (id, status) => clearClientKey(db, id, status),
    createSentinelDevice: (device) => createSentinelDevice(db, device),
    listSentinelDevices: () => listSentinelDevices(db),
    getSentinelDevice: (id) => getSentinelDevice(db, id),
    getSentinelDeviceAuth: (id) => getSentinelDeviceAuth(db, id),
    updateSentinelDeviceStatus: (id, status) =>
      updateSentinelDeviceStatus(db, id, status),
    recordSentinelEvent: (event) => recordSentinelEvent(db, event),
    listSentinelEvents: (filters) => listSentinelEvents(db, filters),
  };
}

async function migrate(db) {
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      plan TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      outline_key_id TEXT,
      outline_key_name TEXT,
      outline_access_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  const columns = await all(db, "PRAGMA table_info(clients)");
  const keyColumn = columns.find((column) => column.name === "outline_key_id");

  if (keyColumn?.notnull) {
    await run(db, "ALTER TABLE clients RENAME TO clients_legacy_notnull");
    await run(
      db,
      `CREATE TABLE clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        plan TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        outline_key_id TEXT,
        outline_key_name TEXT,
        outline_access_url TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    );
    await run(
      db,
      `INSERT INTO clients (
        id, name, email, plan, status, outline_key_id, outline_key_name,
        outline_access_url, created_at, updated_at
      )
      SELECT id, name, email, plan,
        CASE status WHEN 'active' THEN 'approved' WHEN 'cancelled' THEN 'suspended' ELSE status END,
        outline_key_id, outline_key_name, outline_access_url, created_at, updated_at
      FROM clients_legacy_notnull`
    );
    await run(db, "DROP TABLE clients_legacy_notnull");
  }

  await run(
    db,
    `CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status)`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS sentinel_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner TEXT NOT NULL,
      platform TEXT NOT NULL,
      device_fingerprint TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      trust_score INTEGER NOT NULL DEFAULT 50,
      token_hash TEXT NOT NULL UNIQUE,
      last_seen_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS sentinel_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      severity TEXT NOT NULL,
      event_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      source_ip TEXT,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(device_id) REFERENCES sentinel_devices(id)
    )`
  );

  await run(
    db,
    `CREATE INDEX IF NOT EXISTS idx_sentinel_devices_status
     ON sentinel_devices(status)`
  );
  await run(
    db,
    `CREATE INDEX IF NOT EXISTS idx_sentinel_events_device_time
     ON sentinel_events(device_id, created_at)`
  );
  await run(
    db,
    `CREATE INDEX IF NOT EXISTS idx_sentinel_events_severity
     ON sentinel_events(severity)`
  );
}

async function createClient(db, client) {
  const result = await run(
    db,
    `INSERT INTO clients (
      name, email, plan, status, outline_key_id, outline_key_name, outline_access_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      client.name,
      client.email,
      client.plan,
      client.status || "active",
      client.outlineKeyId,
      client.outlineKeyName,
      client.outlineAccessUrl,
    ]
  );

  return getClient(db, result.lastID);
}

function listClients(db) {
  return all(
    db,
    `SELECT id, name, email, plan, status, outline_key_id AS outlineKeyId,
      outline_key_name AS outlineKeyName, created_at AS createdAt, updated_at AS updatedAt
     FROM clients
     ORDER BY id DESC`
  );
}

function getClientByEmail(db, email) {
  return get(
    db,
    `SELECT id, name, email, plan, status, outline_key_id AS outlineKeyId,
      outline_key_name AS outlineKeyName, outline_access_url AS outlineAccessUrl,
      created_at AS createdAt, updated_at AS updatedAt
     FROM clients
     WHERE email = ?`,
    [email]
  );
}

function getClient(db, id) {
  return get(
    db,
    `SELECT id, name, email, plan, status, outline_key_id AS outlineKeyId,
      outline_key_name AS outlineKeyName, outline_access_url AS outlineAccessUrl,
      created_at AS createdAt, updated_at AS updatedAt
     FROM clients
     WHERE id = ?`,
    [id]
  );
}

async function updateClientStatus(db, id, status) {
  await run(
    db,
    `UPDATE clients
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [status, id]
  );

  return getClient(db, id);
}

async function updateClientKey(db, id, key) {
  await run(
    db,
    `UPDATE clients
     SET status = 'approved',
      outline_key_id = ?,
      outline_key_name = ?,
      outline_access_url = ?,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [key.outlineKeyId, key.outlineKeyName, key.outlineAccessUrl, id]
  );

  return getClient(db, id);
}

async function clearClientKey(db, id, status) {
  await run(
    db,
    `UPDATE clients
     SET status = ?,
      outline_key_id = NULL,
      outline_key_name = NULL,
      outline_access_url = NULL,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [status, id]
  );

  return getClient(db, id);
}

async function createSentinelDevice(db, device) {
  const result = await run(
    db,
    `INSERT INTO sentinel_devices (
      name, owner, platform, device_fingerprint, status, token_hash
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      device.name,
      device.owner,
      device.platform,
      device.deviceFingerprint || null,
      device.status || "pending",
      device.tokenHash,
    ]
  );

  return getSentinelDevice(db, result.lastID);
}

function listSentinelDevices(db) {
  return all(
    db,
    `SELECT id, name, owner, platform, device_fingerprint AS deviceFingerprint,
      status, trust_score AS trustScore, last_seen_at AS lastSeenAt,
      created_at AS createdAt, updated_at AS updatedAt
     FROM sentinel_devices
     ORDER BY id DESC`
  );
}

function getSentinelDevice(db, id) {
  return get(
    db,
    `SELECT id, name, owner, platform, device_fingerprint AS deviceFingerprint,
      status, trust_score AS trustScore, last_seen_at AS lastSeenAt,
      created_at AS createdAt, updated_at AS updatedAt
     FROM sentinel_devices
     WHERE id = ?`,
    [id]
  );
}

function getSentinelDeviceAuth(db, id) {
  return get(
    db,
    `SELECT id, status, trust_score AS trustScore, token_hash AS tokenHash
     FROM sentinel_devices
     WHERE id = ?`,
    [id]
  );
}

async function updateSentinelDeviceStatus(db, id, status) {
  await run(
    db,
    `UPDATE sentinel_devices
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [status, id]
  );

  return getSentinelDevice(db, id);
}

async function recordSentinelEvent(db, event) {
  const scoreDeltaBySeverity = {
    informational: 0,
    suspicious: -10,
    critical: -25,
  };
  const scoreDelta = scoreDeltaBySeverity[event.severity] ?? -5;

  const result = await run(
    db,
    `INSERT INTO sentinel_events (
      device_id, severity, event_type, summary, source_ip, details_json
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      event.deviceId,
      event.severity,
      event.eventType,
      event.summary,
      event.sourceIp || null,
      JSON.stringify(event.details || {}),
    ]
  );

  await run(
    db,
    `UPDATE sentinel_devices
     SET last_seen_at = CURRENT_TIMESTAMP,
      trust_score = MAX(0, MIN(100, trust_score + ?)),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [scoreDelta, event.deviceId]
  );

  return get(
    db,
    `SELECT id, device_id AS deviceId, severity, event_type AS eventType,
      summary, source_ip AS sourceIp, details_json AS detailsJson,
      created_at AS createdAt
     FROM sentinel_events
     WHERE id = ?`,
    [result.lastID]
  );
}

function listSentinelEvents(db, filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.deviceId) {
    clauses.push("event.device_id = ?");
    params.push(filters.deviceId);
  }
  if (filters.severity) {
    clauses.push("event.severity = ?");
    params.push(filters.severity);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.min(Number(filters.limit || 100), 500);

  return all(
    db,
    `SELECT event.id, event.device_id AS deviceId, device.name AS deviceName,
      event.severity, event.event_type AS eventType, event.summary,
      event.source_ip AS sourceIp, event.details_json AS detailsJson,
      event.created_at AS createdAt
     FROM sentinel_events event
     JOIN sentinel_devices device ON device.id = event.device_id
     ${where}
     ORDER BY event.id DESC
     LIMIT ?`,
    [...params, limit]
  );
}
