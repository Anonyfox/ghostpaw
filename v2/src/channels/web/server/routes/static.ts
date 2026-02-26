import type { RouteContext } from "../types.ts";

export function createStaticHandlers(assets: {
  clientJs: string;
  bootstrapCss: string;
  customCss?: string;
  bootId: string;
}) {
  return {
    serveAppJs(ctx: RouteContext): void {
      const etag = assets.bootId;
      if (ctx.req.headers["if-none-match"] === etag) {
        ctx.res.writeHead(304, { ETag: etag });
        ctx.res.end();
        return;
      }
      ctx.res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      ctx.res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      ctx.res.setHeader("ETag", etag);
      ctx.res.writeHead(200);
      ctx.res.end(assets.clientJs);
    },

    serveStyleCss(ctx: RouteContext): void {
      const etag = assets.bootId;
      if (ctx.req.headers["if-none-match"] === etag) {
        ctx.res.writeHead(304, { ETag: etag });
        ctx.res.end();
        return;
      }
      const body = `${assets.bootstrapCss}\n${assets.customCss ?? ""}`;
      ctx.res.setHeader("Content-Type", "text/css; charset=utf-8");
      ctx.res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      ctx.res.setHeader("ETag", etag);
      ctx.res.writeHead(200);
      ctx.res.end(body);
    },
  };
}
