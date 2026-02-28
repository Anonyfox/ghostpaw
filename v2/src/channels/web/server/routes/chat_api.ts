import { Chat } from "chatoyant";
import type { TurnContext } from "../../../../core/chat/index.ts";
import { createSession, getHistory, getSession } from "../../../../core/chat/index.ts";
import { getConfig } from "../../../../core/config/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { ChatMessageInfo } from "../../shared/chat_message_info.ts";
import type { ChatSessionInfo } from "../../shared/chat_session_info.ts";
import type { RouteContext } from "../types.ts";
import { createChatSendHandler } from "./chat_send_handler.ts";
import { sseConnections } from "./chat_sse_connections.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

function resolveModel(db: DatabaseHandle): string {
  const configured = getConfig(db, "default_model");
  return typeof configured === "string" && configured ? configured : "claude-sonnet-4-6";
}

export function createChatApiHandlers(db: DatabaseHandle) {
  const defaultModel = resolveModel(db);
  const turnCtx: TurnContext = {
    db,
    tools: [],
    createChat: (m: string) => new Chat({ model: m }),
  };

  return {
    create(routeCtx: RouteContext): void {
      const session = createSession(db, `web:chat:${Date.now()}`, { purpose: "chat" });
      const info: ChatSessionInfo = {
        sessionId: session.id as number,
        model: defaultModel,
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
        model: session.model ?? defaultModel,
        totalTokens,
        createdAt: session.createdAt,
        displayName: session.displayName,
      };

      json(routeCtx, 200, { session: info, messages: mapped });
    },

    stream(routeCtx: RouteContext): void {
      const id = Number(routeCtx.params.id);
      if (!Number.isFinite(id)) {
        routeCtx.res.writeHead(400);
        routeCtx.res.end("Invalid session ID.");
        return;
      }

      routeCtx.res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      routeCtx.res.write(":\n\n");

      sseConnections.set(id, routeCtx.res);

      routeCtx.req.on("close", () => {
        sseConnections.remove(id);
      });
    },

    send: createChatSendHandler({ db, defaultModel, turnCtx }),
  };
}
