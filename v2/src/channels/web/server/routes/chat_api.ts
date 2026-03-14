import { getHistory, getSession } from "../../../../core/chat/api/read/index.ts";
import { createSession } from "../../../../core/chat/api/write/index.ts";
import { resolveModel } from "../../../../harness/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { ChatMessageInfo } from "../../shared/chat_message_info.ts";
import type { ChatSessionInfo } from "../../shared/chat_session_info.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

export function createChatApiHandlers(db: DatabaseHandle) {
  return {
    create(routeCtx: RouteContext): void {
      const session = createSession(db, `web:chat:${Date.now()}`, { purpose: "chat" });
      const info: ChatSessionInfo = {
        sessionId: session.id as number,
        model: resolveModel(db),
        totalTokens: 0,
        createdAt: session.createdAt,
        displayName: null,
      };
      json(routeCtx, 200, info);
    },

    history(routeCtx: RouteContext): void {
      const id = Number(routeCtx.params.id);
      if (!Number.isFinite(id)) {
        json(routeCtx, 400, { error: "Invalid session ID." });
        return;
      }

      const session = getSession(db, id);
      if (!session) {
        json(routeCtx, 404, { error: "Session not found." });
        return;
      }
      if (session.purpose !== "chat") {
        json(routeCtx, 404, { error: "Chat session not found." });
        return;
      }

      const messages = getHistory(db, id);
      const mapped: ChatMessageInfo[] = messages.map((m) => ({
        id: m.id as number,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }));

      const totalTokens = session.tokensIn + session.tokensOut;
      const info: ChatSessionInfo = {
        sessionId: session.id as number,
        model: session.model ?? resolveModel(db),
        totalTokens,
        createdAt: session.createdAt,
        displayName: session.displayName,
      };

      json(routeCtx, 200, { session: info, messages: mapped });
    },
  };
}
