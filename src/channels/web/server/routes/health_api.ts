import type { RouteContext } from "../types.ts";

export function createHealthHandler(config: { version: string; noAuth: boolean }) {
  return function serveHealth(ctx: RouteContext): void {
    ctx.res.writeHead(200, { "Content-Type": "application/json" });
    ctx.res.end(JSON.stringify({ status: "ok", version: config.version, desktop: config.noAuth }));
  };
}
