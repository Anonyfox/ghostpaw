import type { RouteContext } from "../types.ts";

export function createSpaHandler(
  renderShellFn: (bootId: string, desktop?: boolean) => string,
  bootId: string,
  desktop = false,
) {
  return function serveSpaShell(ctx: RouteContext): void {
    const html = renderShellFn(bootId, desktop);
    ctx.res.setHeader("Content-Type", "text/html; charset=utf-8");
    ctx.res.setHeader("Cache-Control", "no-cache");
    ctx.res.writeHead(200);
    ctx.res.end(html);
  };
}
