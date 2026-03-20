import { statfsSync, statSync } from "node:fs";
import { formatBytes, formatUptime } from "../../../../harness/commands/cmd_status.ts";
import { resolveDbPath } from "../../../../lib/resolve_db_path.ts";
import {
  installService,
  resolveServiceConfig,
  serviceStatus,
  uninstallService,
} from "../../../../lib/service/index.ts";
import { requestRestart, sendCommand } from "../../../../lib/supervisor.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";

const COOLDOWN_MS = 30_000;
let lastRestartMs = 0;

interface SupervisorApiConfig {
  version: string;
  workspace: string;
}

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

function gatherDiskAndDb(workspace: string) {
  let diskTotal = 0;
  let diskFree = 0;
  try {
    const fs = statfsSync(workspace);
    diskTotal = fs.blocks * fs.bsize;
    diskFree = fs.bavail * fs.bsize;
  } catch {
    // statfsSync unavailable on this path (e.g. virtual/network filesystem)
  }
  let dbSize = 0;
  try {
    dbSize = statSync(resolveDbPath(workspace)).size;
  } catch {
    // database file not yet created or inaccessible
  }
  return { diskTotal, diskFree, dbSize };
}

async function gatherStatusData(config: SupervisorApiConfig) {
  let supervisorPid: unknown = null;
  let supervisorCrashes: unknown = null;
  try {
    const resp = await sendCommand(config.workspace, "status");
    if (resp.ok) {
      supervisorPid = resp.pid;
      supervisorCrashes = resp.crashes;
    }
  } catch {
    // supervisor socket unavailable -- process is unsupervised or socket dead
  }

  const svc = serviceStatus(config.workspace);
  const { diskTotal, diskFree, dbSize } = gatherDiskAndDb(config.workspace);

  return {
    version: config.version,
    uptimeMs: Math.round(process.uptime() * 1000),
    uptime: formatUptime(process.uptime()),
    supervisor: { pid: supervisorPid, crashes: supervisorCrashes },
    service: { initSystem: svc.initSystem, installed: svc.installed, running: svc.running },
    disk: {
      total: diskTotal,
      free: diskFree,
      used: diskTotal - diskFree,
      totalFormatted: formatBytes(diskTotal),
      freeFormatted: formatBytes(diskFree),
    },
    dbSize,
    dbSizeFormatted: formatBytes(dbSize),
  };
}

export function createSupervisorApiHandlers(config: SupervisorApiConfig) {
  return {
    async status(ctx: RouteContext): Promise<void> {
      json(ctx, 200, await gatherStatusData(config));
    },

    restart(ctx: RouteContext): void {
      const now = Date.now();
      if (lastRestartMs > 0 && now - lastRestartMs < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - (now - lastRestartMs)) / 1000);
        json(ctx, 429, { error: `Restart on cooldown. Try again in ${remaining}s.` });
        return;
      }
      lastRestartMs = now;
      json(ctx, 200, { ok: true });
      setTimeout(() => requestRestart(), 500);
    },

    async stop(ctx: RouteContext): Promise<void> {
      let body: unknown;
      try {
        body = await readJsonBody(ctx.req);
      } catch {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }

      const obj = body as Record<string, unknown>;
      if (!obj || obj.confirm !== true) {
        json(ctx, 400, { error: "Requires { confirm: true } in body." });
        return;
      }

      try {
        const resp = await sendCommand(config.workspace, "stop");
        json(ctx, 200, { ok: resp.ok });
      } catch {
        json(ctx, 503, { error: "Supervisor is not running." });
      }
    },

    install(ctx: RouteContext): void {
      if (process.platform === "win32") {
        json(ctx, 400, { error: "Service install is not available on Windows." });
        return;
      }
      const current = serviceStatus(config.workspace);
      if (current.installed) {
        json(ctx, 200, { ok: true, message: `Already installed (${current.initSystem}).` });
        return;
      }
      const result = installService(resolveServiceConfig(config.workspace));
      if (result.success) {
        json(ctx, 200, { ok: true, message: result.message, initSystem: result.initSystem });
      } else {
        json(ctx, 500, { error: result.message });
      }
    },

    uninstall(ctx: RouteContext): void {
      if (process.platform === "win32") {
        json(ctx, 400, { error: "Service uninstall is not available on Windows." });
        return;
      }
      const current = serviceStatus(config.workspace);
      if (!current.installed) {
        json(ctx, 200, { ok: true, message: "Service is not installed." });
        return;
      }
      const result = uninstallService(config.workspace);
      if (result.success) {
        json(ctx, 200, { ok: true, message: result.message });
      } else {
        json(ctx, 500, { error: result.message });
      }
    },
  };
}
