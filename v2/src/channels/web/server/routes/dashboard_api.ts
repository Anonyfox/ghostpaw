import { listSecrets } from "../../../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";

export interface DashboardStats {
  version: string;
  uptimeMs: number;
  secretsCount: number;
}

export function createDashboardHandler(config: { version: string; db: DatabaseHandle }) {
  return function serveDashboard(ctx: RouteContext): void {
    const stats: DashboardStats = {
      version: config.version,
      uptimeMs: Math.round(process.uptime() * 1000),
      secretsCount: listSecrets(config.db).length,
    };
    ctx.res.writeHead(200, { "Content-Type": "application/json" });
    ctx.res.end(JSON.stringify(stats));
  };
}
