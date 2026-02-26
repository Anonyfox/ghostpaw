import { randomBytes } from "node:crypto";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createServer } from "node:http";
import type { DatabaseHandle } from "../../../lib/database.ts";
import { generateNonce } from "./csp_nonce.ts";
import { createRateLimiter } from "./rate_limiter.ts";
import { createRoute, matchRoute } from "./router.ts";
import { createAuthHandlers } from "./routes/auth.ts";
import { createDashboardHandler } from "./routes/dashboard_api.ts";
import { createSecretsApiHandlers } from "./routes/secrets_api.ts";
import { createSpaHandler } from "./routes/spa.ts";
import { createStaticHandlers } from "./routes/static.ts";
import { applySecurityHeaders } from "./security_headers.ts";
import { renderShell } from "./shell.tsx";

export interface WebServerConfig {
  port: number;
  passwordHash: string;
  clientJs: string;
  bootstrapCss: string;
  db: DatabaseHandle;
  customCss?: string;
  secure?: boolean;
  version?: string;
}

export function createWebServer(config: WebServerConfig): Server {
  const {
    passwordHash,
    clientJs,
    bootstrapCss,
    db,
    customCss,
    secure = false,
    version = "0.0.0-dev",
  } = config;

  if (!passwordHash) {
    throw new Error("WEB_UI_PASSWORD must be set before starting the web server.");
  }

  const bootId = randomBytes(8).toString("hex");

  const authHandlers = createAuthHandlers({ passwordHash, secure });
  const staticHandlers = createStaticHandlers({ clientJs, bootstrapCss, customCss, bootId });
  const spaHandler = createSpaHandler(renderShell, bootId);
  const dashboardHandler = createDashboardHandler({ version, db });
  const secretsHandlers = createSecretsApiHandlers(db);

  const routes = [
    createRoute("POST", "/api/auth/login", authHandlers.login, false),
    createRoute("POST", "/api/auth/logout", authHandlers.logout, true),
    createRoute("GET", "/api/dashboard", dashboardHandler, true),
    createRoute("GET", "/api/secrets", secretsHandlers.list, true),
    createRoute("POST", "/api/secrets", secretsHandlers.set, true),
    createRoute("DELETE", "/api/secrets/:key", secretsHandlers.remove, true),
    createRoute("GET", "/assets/app.js", staticHandlers.serveAppJs, false),
    createRoute("GET", "/assets/style.css", staticHandlers.serveStyleCss, false),
  ];

  const generalLimiter = createRateLimiter(100, 60_000);
  const authLimiter = createRateLimiter(5, 60_000);

  const cleanupTimer = setInterval(() => {
    generalLimiter.cleanup();
    authLimiter.cleanup();
  }, 5 * 60_000);
  cleanupTimer.unref();

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      await handleRequest(req, res);
    } catch {
      jsonError(res, 500, "Internal server error.");
    }
  });

  return server;

  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const nonce = generateNonce();
    applySecurityHeaders(res, nonce);

    const ip = req.socket.remoteAddress ?? "unknown";
    if (!generalLimiter.check(ip)) {
      jsonError(res, 429, "Too many requests.");
      return;
    }

    const url = `http://localhost${req.url ?? "/"}`;
    const method = req.method ?? "GET";
    const match = matchRoute(routes, method, url);

    if (match) {
      const { route, params } = match;
      const ctx = { req, res, params, nonce };

      if (route.requiresAuth && !authHandlers.checkSession(ctx)) {
        jsonError(res, 401, "Unauthorized.");
        return;
      }

      if (url.includes("/api/auth/login") && !authLimiter.check(ip)) {
        jsonError(res, 429, "Too many requests.");
        return;
      }

      await route.handler(ctx);
      return;
    }

    if (method === "GET") {
      spaHandler({ req, res, params: {}, nonce });
      return;
    }

    jsonError(res, 404, "Not found.");
  }
}

function jsonError(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: message }));
}
