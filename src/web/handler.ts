import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ChannelRuntime } from "../channels/runtime.js";
import {
  getBearerToken,
  getClientIP,
  getSessionCookie,
  validateOrigin,
  validateSessionToken,
} from "./auth.js";
import { SECURITY_HEADERS } from "./constants.js";
import { checkGeneralRateLimit } from "./rate-limit.js";
import { json, redirect } from "./response.js";
import type { Router } from "./router.js";
import type { RequestContext } from "./types.js";

export interface HandlerConfig {
  router: Router;
  runtime: ChannelRuntime;
  passwordHash: string;
  origin: string;
  isLocalhost: boolean;
}

export function createRequestHandler(config: HandlerConfig) {
  const { router, runtime, origin, isLocalhost } = config;
  let { passwordHash } = config;

  function setPasswordHash(hash: string) {
    passwordHash = hash;
  }

  function handle(req: IncomingMessage, res: ServerResponse): void {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(key, value);
    }
    if (!isLocalhost) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    const clientIP = getClientIP(req);
    if (!checkGeneralRateLimit(clientIP)) {
      res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "60" });
      res.end(JSON.stringify({ error: "Too many requests" }));
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const path = url.pathname;
    const method = req.method ?? "GET";
    const nonce = randomBytes(16).toString("base64url");

    const route = router.match(method, path);
    if (!route) {
      json(res, 404, { error: "Not found" });
      return;
    }

    if (!validateOrigin(req, origin)) {
      json(res, 403, { error: "Origin mismatch" });
      return;
    }

    const ctx: RequestContext = {
      runtime,
      passwordHash,
      origin,
      nonce,
      path,
      isLocalhost,
    };

    if (route.requiresAuth) {
      const cookieToken = getSessionCookie(req);
      const bearerToken = getBearerToken(req);
      const token = cookieToken ?? bearerToken;
      if (!token || !validateSessionToken(token, passwordHash)) {
        if (method === "GET" && !path.startsWith("/api/")) {
          redirect(res, "/login");
        } else {
          json(res, 401, { error: "Unauthorized" });
        }
        return;
      }
    }

    Promise.resolve(route.handler(req, res, ctx)).catch((err) => {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
      if (!res.headersSent) {
        json(res, statusCode, {
          error: statusCode === 500 ? "Internal server error" : (err as Error).message,
        });
      }
    });
  }

  return { handle, setPasswordHash };
}
