import { randomBytes } from "node:crypto";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createServer } from "node:http";
import { buildRoutes } from "./build_routes.ts";
import { generateNonce } from "./csp_nonce.ts";
import { matchRoute } from "./match_route.ts";
import { createRateLimiter } from "./rate_limiter.ts";
import { createSpaHandler } from "./routes/spa.ts";
import { applySecurityHeaders } from "./security_headers.ts";
import { renderShell } from "./shell.tsx";
import type { WebServerConfig } from "./types.ts";

export function createWebServer(config: WebServerConfig): Server {
  if (!config.passwordHash) {
    throw new Error("WEB_UI_PASSWORD must be set before starting the web server.");
  }

  const bootId = randomBytes(8).toString("hex");
  const spaHandler = createSpaHandler(renderShell, bootId);
  const { routes, checkSession } = buildRoutes({
    ...config,
    secure: config.secure ?? false,
    version: config.version ?? "0.0.0-dev",
    bootId,
    spaHandler,
  });

  const generalLimiter = createRateLimiter(100, 60_000);
  const authLimiter = createRateLimiter(5, 60_000);
  const cleanupTimer = setInterval(() => {
    generalLimiter.cleanup();
    authLimiter.cleanup();
  }, 5 * 60_000);
  cleanupTimer.unref();

  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      await handleRequest(req, res, {
        routes,
        checkSession,
        spaHandler,
        generalLimiter,
        authLimiter,
      });
    } catch (err) {
      console.error("[web] unhandled request error:", err);
      jsonError(res, 500, "Internal server error.");
    }
  });
}

function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: {
    routes: ReturnType<typeof buildRoutes>["routes"];
    checkSession: ReturnType<typeof buildRoutes>["checkSession"];
    spaHandler: ReturnType<typeof createSpaHandler>;
    generalLimiter: ReturnType<typeof createRateLimiter>;
    authLimiter: ReturnType<typeof createRateLimiter>;
  },
): Promise<void> | void {
  const nonce = generateNonce();
  applySecurityHeaders(res, nonce);

  const ip = req.socket.remoteAddress ?? "unknown";
  if (!deps.generalLimiter.check(ip)) {
    jsonError(res, 429, "Too many requests.");
    return;
  }

  const url = `http://localhost${req.url ?? "/"}`;
  const method = req.method ?? "GET";
  const match = matchRoute(deps.routes, method, url);

  if (match) {
    const { route, params } = match;
    const ctx = { req, res, params, nonce };
    if (route.requiresAuth && !deps.checkSession(ctx)) {
      jsonError(res, 401, "Unauthorized.");
      return;
    }
    if (url.includes("/api/auth/login") && !deps.authLimiter.check(ip)) {
      jsonError(res, 429, "Too many requests.");
      return;
    }
    return route.handler(ctx) as Promise<void>;
  }

  if (method === "GET") {
    deps.spaHandler({ req, res, params: {}, nonce });
    return;
  }

  jsonError(res, 404, "Not found.");
}

function jsonError(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: message }));
}
