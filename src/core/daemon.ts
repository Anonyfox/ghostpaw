import { resolve } from "node:path";
import type { ChannelAdapter } from "../channels/runtime.js";
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

  console.log(`ghostpaw daemon started (pid ${process.pid})`);

  // ── Channel startup ──────────────────────────────────────────────────────

  const channels: ChannelAdapter[] = [];

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  if (telegramToken) {
    try {
      const { createChannelRuntime } = await import("../channels/runtime.js");
      const { createTelegramChannel } = await import("../channels/telegram.js");

      const runtime = await createChannelRuntime({ workspace });
      const telegram = createTelegramChannel({ token: telegramToken, runtime });
      const result = (await telegram.start()) as { username: string };
      channels.push(telegram);

      info(`channel started: telegram @${result.username}`);
      console.log(`  telegram active (@${result.username})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      error(`telegram channel failed to start: ${msg}`);
      console.error(`  telegram channel failed: ${msg}`);
    }
  }

  if (channels.length === 0) {
    info("no channels configured — daemon idle");
    console.log("  no channels configured (set TELEGRAM_BOT_TOKEN via secrets)");
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  const heartbeat = setInterval(() => {}, 30_000);

  async function shutdown(signal: string): Promise<void> {
    info(`${signal} received, shutting down`);

    for (const ch of channels) {
      try {
        await ch.stop();
        info(`channel stopped: ${ch.name}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        error(`error stopping ${ch.name}: ${msg}`);
      }
    }

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
