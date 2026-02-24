import { createServer, type Server } from "node:http";
import type { ChannelAdapter, ChannelRuntime } from "../channels/runtime.js";
import { cleanupRateBuckets, hashPassword } from "./auth.js";
import { CLEANUP_INTERVAL_MS } from "./constants.js";
import { createRequestHandler } from "./handler.js";
import { cleanupGeneralBuckets } from "./rate-limit.js";
import { createRouter } from "./router.js";
import { registerAPIRoutes } from "./routes-api.js";
import { registerAuthRoutes } from "./routes-auth.js";
import { registerStaticRoutes } from "./routes-static.js";
import type { WebChannelConfig, WebStartResult } from "./types.js";

export function createWebChannel(
  runtime: ChannelRuntime,
  config: WebChannelConfig = {},
): ChannelAdapter {
  const host = config.host ?? "127.0.0.1";
  const port = config.port ?? 3000;
  const isLocalhost = host === "127.0.0.1" || host === "localhost" || host === "::1";
  const protocol = isLocalhost ? "http" : "https";
  const origin = `${protocol}://${host}${port === 80 || port === 443 ? "" : `:${port}`}`;

  let server: Server | null = null;
  let cleanupTimer: ReturnType<typeof setInterval> | null = null;

  let passwordHash = runtime.secrets.get("WEB_UI_PASSWORD");
  if (!passwordHash) {
    throw new Error("WEB_UI_PASSWORD not set. Run: ghostpaw secrets set WEB_UI_PASSWORD");
  }

  if (!passwordHash.match(/^[0-9a-f]{32}:[0-9a-f]{128}$/)) {
    passwordHash = hashPassword(passwordHash);
    runtime.secrets.set("WEB_UI_PASSWORD", passwordHash);
  }

  const router = createRouter();

  registerAuthRoutes(router);
  registerStaticRoutes(router);
  registerAPIRoutes(router, runtime);

  const handler = createRequestHandler({
    router,
    runtime,
    passwordHash,
    origin,
    isLocalhost,
  });

  return {
    name: "web",

    async start(): Promise<WebStartResult> {
      return new Promise((resolve, reject) => {
        server = createServer(handler.handle);
        server.keepAliveTimeout = 65_000;
        server.headersTimeout = 66_000;

        server.on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE") {
            reject(new Error(`Port ${port} is already in use`));
          } else {
            reject(err);
          }
        });

        server.listen(port, host, () => {
          cleanupTimer = setInterval(() => {
            cleanupRateBuckets();
            cleanupGeneralBuckets();
          }, CLEANUP_INTERVAL_MS);
          const url = `http://${host}:${port}`;
          resolve({ url, host, port });
        });
      });
    },

    async stop(): Promise<void> {
      if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
      }
      return new Promise((resolve) => {
        if (server) {
          server.closeAllConnections();
          server.close(() => resolve());
        } else {
          resolve();
        }
      });
    },
  };
}
