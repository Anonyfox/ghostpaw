import type { TurnContext } from "../../../../core/chat/index.ts";
import { generateSessionTitle, getHistory, streamTurn } from "../../../../core/chat/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";
import { sseConnections } from "./chat_sse_connections.ts";
import { streamToSse } from "./stream_to_sse.ts";

const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful AI assistant. Respond concisely, accurately, and directly.";

interface SendHandlerDeps {
  db: DatabaseHandle;
  defaultModel: string;
  turnCtx: TurnContext;
}

export function createChatSendHandler(deps: SendHandlerDeps) {
  const { db, defaultModel, turnCtx } = deps;

  return async function send(routeCtx: RouteContext): Promise<void> {
    const id = Number(routeCtx.params.id);
    if (!Number.isFinite(id)) {
      json(routeCtx, 400, { error: "Invalid session ID." });
      return;
    }

    let body: unknown;
    try {
      body = await readJsonBody(routeCtx.req);
    } catch {
      json(routeCtx, 400, { error: "Invalid request body." });
      return;
    }

    const parsed = (body ?? {}) as Record<string, unknown>;
    const content = parsed.content;
    const overrideModel = parsed.model;
    if (typeof content !== "string" || !content.trim()) {
      json(routeCtx, 400, { error: "Missing or empty content." });
      return;
    }

    const sseRes = sseConnections.get(id);
    if (!sseRes) {
      json(routeCtx, 409, { error: "No SSE connection for this session." });
      return;
    }

    const turnModel =
      typeof overrideModel === "string" && overrideModel.trim()
        ? overrideModel.trim()
        : defaultModel;

    const messagesBefore = getHistory(db, id);
    const isFirstTurn = messagesBefore.length === 0;

    json(routeCtx, 200, { ok: true });

    const trimmedContent = content.trim();
    const gen = streamTurn(
      {
        sessionId: id,
        content: trimmedContent,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        model: turnModel,
      },
      turnCtx,
    );

    await streamToSse(gen, sseRes);

    if (isFirstTurn) {
      generateSessionTitle(db, id, trimmedContent, turnModel, turnCtx.createChat)
        .then((title) => {
          const conn = sseConnections.get(id);
          if (conn && title) {
            conn.write(`event: title\ndata: ${JSON.stringify(title)}\n\n`);
          }
        })
        .catch(() => {});
    }
  };
}

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}
