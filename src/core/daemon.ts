import { resolve } from "node:path";
import type { GhostpawDatabase } from "./database.js";

const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function appendLog(db: GhostpawDatabase, level: string, message: string): void {
  db.sqlite
    .prepare("INSERT INTO logs (level, message, created_at) VALUES (?, ?, ?)")
    .run(level, message, Date.now());
}

function vacuumOldLogs(db: GhostpawDatabase): void {
  const cutoff = Date.now() - LOG_RETENTION_MS;
  db.sqlite.prepare("DELETE FROM logs WHERE created_at < ?").run(cutoff);
}

export async function startDaemon(workspace: string): Promise<void> {
  const { loadConfig } = await import("./config.js");
  const { createDatabase } = await import("./database.js");
  const { createSecretStore } = await import("./secrets.js");

  workspace = resolve(workspace);
  const db = await createDatabase(resolve(workspace, "ghostpaw.db"));

  const secrets = createSecretStore(db);
  secrets.loadIntoEnv();
  secrets.syncProviderKeys();

  const config = await loadConfig(workspace);

  vacuumOldLogs(db);

  const info = (msg: string) => appendLog(db, "info", msg);
  const error = (msg: string) => appendLog(db, "error", msg);

  info(`daemon started (pid ${process.pid})`);
  info(`workspace: ${workspace}`);
  info(`model: ${config.models.default}`);

  // Minimal stdout for service manager crash capture
  console.log(`ghostpaw daemon started (pid ${process.pid})`);

  const heartbeat = setInterval(() => {
    // Keeps event loop alive — no logging
  }, 30_000);

  function shutdown(signal: string): void {
    info(`${signal} received, shutting down`);
    clearInterval(heartbeat);
    db.close();
    console.log(`ghostpaw shutdown (${signal})`);
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGHUP", () => {
    info("SIGHUP received (config reload — not yet implemented)");
  });

  process.on("uncaughtException", (err) => {
    error(`uncaughtException: ${err.message}`);
    shutdown("uncaughtException");
  });
}
