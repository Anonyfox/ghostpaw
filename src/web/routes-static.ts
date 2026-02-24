import { BOOT_ID } from "./constants.js";
import type { Router } from "./router.js";

const ASSET_HEADERS = {
  "Cache-Control": "public, max-age=31536000, immutable",
  ETag: `"${BOOT_ID}"`,
};

export function registerStaticRoutes(router: Router): void {
  router.add(
    "GET",
    "/assets/style.css",
    async (req, res) => {
      if (req.headers["if-none-match"] === `"${BOOT_ID}"`) {
        res.writeHead(304, ASSET_HEADERS);
        res.end();
        return;
      }
      const { bootstrapCSS, customCSS } = await import("./templates.js");
      res.writeHead(200, {
        "Content-Type": "text/css; charset=utf-8",
        ...ASSET_HEADERS,
      });
      res.end(`${bootstrapCSS}\n${customCSS}`);
    },
    false,
  );

  router.add(
    "GET",
    "/assets/app.js",
    async (req, res) => {
      if (req.headers["if-none-match"] === `"${BOOT_ID}"`) {
        res.writeHead(304, ASSET_HEADERS);
        res.end();
        return;
      }
      const { clientJS } = await import("./client.js");
      res.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8",
        ...ASSET_HEADERS,
      });
      res.end(clientJS);
    },
    false,
  );

  router.add(
    "GET",
    "/assets/marked.js",
    async (req, res) => {
      if (req.headers["if-none-match"] === `"${BOOT_ID}"`) {
        res.writeHead(304, ASSET_HEADERS);
        res.end();
        return;
      }
      const { markedJS } = await import("./client.js");
      res.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8",
        ...ASSET_HEADERS,
      });
      res.end(markedJS);
    },
    false,
  );
}
