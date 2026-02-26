import type { ServerResponse } from "node:http";
import { readJsonBody } from "../body_parser.ts";
import { clearSessionCookie, parseCookies, setSessionCookie } from "../cookie.ts";
import { verifyPassword } from "../password.ts";
import { createSessionToken, verifySessionToken } from "../session_token.ts";
import type { RouteContext } from "../types.ts";

function jsonResponse(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export function createAuthHandlers(config: { passwordHash: string; secure: boolean }) {
  return {
    async login(ctx: RouteContext): Promise<void> {
      let body: unknown;
      try {
        body = await readJsonBody(ctx.req);
      } catch {
        jsonResponse(ctx.res, 400, { error: "Missing password field." });
        return;
      }

      if (
        typeof body !== "object" ||
        body === null ||
        !("password" in body) ||
        typeof (body as Record<string, unknown>).password !== "string"
      ) {
        jsonResponse(ctx.res, 400, { error: "Missing password field." });
        return;
      }

      const { password } = body as { password: string };
      const valid = await verifyPassword(password, config.passwordHash);
      if (!valid) {
        jsonResponse(ctx.res, 401, { error: "Invalid password." });
        return;
      }

      const token = createSessionToken(config.passwordHash);
      setSessionCookie(ctx.res, token, config.secure);
      jsonResponse(ctx.res, 200, { ok: true });
    },

    async logout(ctx: RouteContext): Promise<void> {
      clearSessionCookie(ctx.res, config.secure);
      jsonResponse(ctx.res, 200, { ok: true });
    },

    checkSession(ctx: RouteContext): boolean {
      const cookies = parseCookies(ctx.req.headers.cookie);
      const token = cookies.ghostpaw_session;
      if (!token) return false;
      return verifySessionToken(token, config.passwordHash);
    },
  };
}
