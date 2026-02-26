import type { RouteContext } from "../types.ts";

export function createSpaHandler(
  renderShellFn: (nonce: string, bootId: string) => string,
  bootId: string,
) {
  return function serveSpaShell(ctx: RouteContext): void {
    const html = renderShellFn(ctx.nonce, bootId);
    ctx.res.setHeader("Content-Type", "text/html; charset=utf-8");
    ctx.res.setHeader("Cache-Control", "no-cache");
    ctx.res.writeHead(200);
    ctx.res.end(html);
  };
}
