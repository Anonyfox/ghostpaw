import {
  deriveSessionTitle,
  getSession,
  getSessionMessage,
  listSessions,
} from "../../../../core/chat/api/read/index.ts";
import { renameSession } from "../../../../core/chat/api/write/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { ChatSessionSummary } from "../../shared/chat_session_summary.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";

const LIST_LIMIT = 50;

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

function channelFromKey(key: string): string {
  const colon = key.indexOf(":");
  return colon > 0 ? key.slice(0, colon) : "unknown";
}

export function createChatSessionsApiHandlers(db: DatabaseHandle) {
  return {
    list(routeCtx: RouteContext): void {
      const sessions = listSessions(db, { purpose: "chat", distilled: false, limit: LIST_LIMIT });

      const summaries: ChatSessionSummary[] = sessions.map((s) => {
        let displayName = s.displayName;
        if (!displayName) {
          const msg = getSessionMessage(db, s.id, "user", "first") ?? "";
          displayName = deriveSessionTitle(msg);
        }
        return {
          sessionId: s.id,
          displayName,
          model: s.model,
          totalTokens: s.tokensIn + s.tokensOut,
          lastActiveAt: s.lastActiveAt,
          channel: channelFromKey(s.key),
        };
      });

      json(routeCtx, 200, summaries);
    },

    async rename(routeCtx: RouteContext): Promise<void> {
      const id = Number(routeCtx.params.id);
      if (!Number.isFinite(id)) {
        json(routeCtx, 400, { error: "Invalid session ID." });
        return;
      }

      const session = getSession(db, id);
      if (!session || session.purpose !== "chat") {
        json(routeCtx, 404, { error: "Chat session not found." });
        return;
      }

      let body: unknown;
      try {
        body = await readJsonBody(routeCtx.req);
      } catch {
        json(routeCtx, 400, { error: "Invalid request body." });
        return;
      }

      const { displayName } = (body ?? {}) as Record<string, unknown>;
      if (typeof displayName !== "string" || !displayName.trim()) {
        json(routeCtx, 400, { error: "Missing or empty displayName." });
        return;
      }

      renameSession(db, id, displayName.trim());
      json(routeCtx, 200, { ok: true });
    },
  };
}
