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
