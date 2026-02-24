import {
  checkRateLimit,
  clearSessionCookie,
  createSessionToken,
  getClientIP,
  recordFailure,
  setSessionCookie,
  verifyPassword,
} from "./auth.js";
import { parseJSON } from "./body.js";
import { html, json } from "./response.js";
import type { Router } from "./router.js";

export function registerAuthRoutes(router: Router): void {
  router.add(
    "GET",
    "/health",
    (_req, res) => {
      json(res, 200, { ok: true });
    },
    false,
  );

  router.add(
    "GET",
    "/login",
    async (_req, res, ctx) => {
      const { loginPage } = await import("./templates.js");
      html(res, 200, loginPage(ctx.nonce), ctx.nonce);
    },
    false,
  );

  router.add(
    "POST",
    "/login",
    async (req, res, ctx) => {
      const ip = getClientIP(req);
      if (!checkRateLimit(ip)) {
        json(res, 429, { error: "Too many login attempts. Try again later." });
        return;
      }
      try {
        const body = (await parseJSON(req)) as { password?: string };
        const pw = body?.password;
        if (typeof pw !== "string" || !pw) {
          recordFailure(ip);
          json(res, 401, { error: "Invalid credentials" });
          return;
        }
        if (!verifyPassword(pw, ctx.passwordHash)) {
          recordFailure(ip);
          json(res, 401, { error: "Invalid credentials" });
          return;
        }
        const token = createSessionToken(ctx.passwordHash);
        setSessionCookie(res, token, ctx.isLocalhost);
        json(res, 200, { ok: true, token });
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode ?? 400;
        json(res, statusCode, { error: (err as Error).message });
      }
    },
    false,
  );

  router.add(
    "POST",
    "/logout",
    (_req, res) => {
      clearSessionCookie(res);
      json(res, 200, { ok: true });
    },
    false,
  );

  router.add("GET", "/", async (_req, res, ctx) => {
    const { appShell } = await import("./templates.js");
    html(res, 200, appShell(ctx.nonce), ctx.nonce);
  });
}
