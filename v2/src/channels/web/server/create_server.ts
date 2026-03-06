import { randomBytes } from "node:crypto";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createServer } from "node:http";
import type { Duplex } from "node:stream";
import { registerChannel, unregisterChannel } from "../../../lib/channel_registry.ts";
import { upgradeToWebSocket } from "../../../lib/ws.ts";
import { buildRoutes } from "./build_routes.ts";
import { matchRoute } from "./match_route.ts";
import { parseCookies } from "./parse_cookies.ts";
import { createRateLimiter } from "./rate_limiter.ts";
import { handleChatWs } from "./routes/chat_ws.ts";
import { createSpaHandler } from "./routes/spa.ts";
import { applySecurityHeaders } from "./security_headers.ts";
import { renderShell } from "./shell.tsx";
import type { WebServerConfig } from "./types.ts";
import { verifySessionToken } from "./verify_session_token.ts";

const WEB_CHANNEL_ID = "web";

const WS_CHAT_PATTERN = /^\/ws\/chat\/(\d+)$/;

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

  const generalLimiter = createRateLimiter(600, 60_000);
  const authLimiter = createRateLimiter(5, 60_000);
  const cleanupTimer = setInterval(() => {
    generalLimiter.cleanup();
    authLimiter.cleanup();
  }, 5 * 60_000);
  cleanupTimer.unref();

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
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

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = req.url ?? "";
    const match = WS_CHAT_PATTERN.exec(url);
    if (!match) {
      socket.end("HTTP/1.1 404 Not Found\r\n\r\n");
      return;
    }

    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.ghostpaw_session;
    if (!token || !verifySessionToken(token, config.passwordHash)) {
      socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n");
      return;
    }

    if (!config.entity) {
      socket.end("HTTP/1.1 503 Service Unavailable\r\n\r\n");
      return;
    }

    const sessionId = Number(match[1]);
    const ws = upgradeToWebSocket(req, socket, head);
    if (!ws) {
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
      return;
    }

    handleChatWs(sessionId, ws, config.entity);
  });

  registerChannel(WEB_CHANNEL_ID, {
    type: "web",
    isConnected: () => server.listening,
    send: async () => {
      // Web delivery is passive — howls are fetched via polling /api/howls/pending.
      // No active push needed; the channel registration ensures howls are attributed to "web".
    },
  });

  server.on("close", () => {
    unregisterChannel(WEB_CHANNEL_ID);
  });

  return server;
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
  res.setHeader("X-Content-Type-Options", "nosniff");

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
    const ctx = { req, res, params };
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
    applySecurityHeaders(res);
    deps.spaHandler({ req, res, params: {} });
    return;
  }

  jsonError(res, 404, "Not found.");
}

function jsonError(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: message }));
}
