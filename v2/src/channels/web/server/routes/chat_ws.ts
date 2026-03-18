import type { TurnResult } from "../../../../core/chat/api/write/index.ts";
import { listStoredSecretKeys } from "../../../../core/secrets/api/read/index.ts";
import { executeCommand, parseSlashCommand } from "../../../../harness/commands/registry.ts";
import type { CommandContext } from "../../../../harness/commands/types.ts";
import type { Entity } from "../../../../harness/index.ts";
import type { WsConnection } from "../../../../lib/ws.ts";

const connections = new Map<number, WsConnection>();

export const chatWsConnections = {
  set(sessionId: number, ws: WsConnection): void {
    connections.set(sessionId, ws);
  },
  get(sessionId: number): WsConnection | undefined {
    return connections.get(sessionId);
  },
  remove(sessionId: number): void {
    connections.delete(sessionId);
  },
  count(): number {
    return connections.size;
  },
};

export function handleChatWs(sessionId: number, ws: WsConnection, entity: Entity): void {
  chatWsConnections.set(sessionId, ws);

  let streaming = false;

  ws.on("message", (raw) => {
    let msg: { type?: string; content?: string; model?: string; replyToId?: number };
    try {
      msg = JSON.parse(raw);
    } catch {
      wsSend(ws, { type: "error", message: "Invalid JSON." });
      return;
    }

    if (msg.type === "send") {
      if (streaming) {
        wsSend(ws, { type: "error", message: "Already streaming a response." });
        return;
      }
      const content = typeof msg.content === "string" ? msg.content.trim() : "";
      if (!content) {
        wsSend(ws, { type: "error", message: "Empty message." });
        return;
      }

      const parsed = parseSlashCommand(content);
      if (parsed) {
        handleSlashCommand(ws, entity, sessionId, parsed.name, parsed.args);
        return;
      }

      const replyToId = typeof msg.replyToId === "number" ? msg.replyToId : undefined;
      streaming = true;
      streamResponse(ws, entity, sessionId, content, msg.model, replyToId).finally(() => {
        streaming = false;
      });
    }
  });

  ws.on("close", () => {
    chatWsConnections.remove(sessionId);
  });
}

async function handleSlashCommand(
  ws: WsConnection,
  entity: Entity,
  sessionId: number,
  name: string,
  args: string,
): Promise<void> {
  try {
    const configuredKeys = new Set(listStoredSecretKeys(entity.db));
    const cmdCtx: CommandContext = {
      db: entity.db,
      sessionId,
      sessionKey: `web:${sessionId}`,
      configuredKeys,
    };
    const result = await executeCommand(name, args, cmdCtx);
    wsSend(ws, { type: "command_result", text: result.text, action: result.action ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    wsSend(ws, { type: "error", message });
  }
}

async function streamResponse(
  ws: WsConnection,
  entity: Entity,
  sessionId: number,
  content: string,
  model?: string,
  replyToId?: number,
): Promise<void> {
  try {
    const gen = entity.streamTurn(sessionId, content, {
      model,
      replyToId,
      onTitleGenerated: (title) => {
        wsSend(ws, { type: "title", title });
      },
      onToolCallStart: (calls) => {
        wsSend(ws, { type: "tool_start", tools: calls.map((c) => c.name) });
      },
      onToolCallComplete: () => {
        wsSend(ws, { type: "tool_end" });
      },
    });

    let result: TurnResult;
    for (;;) {
      const next = await gen.next();
      if (next.done) {
        result = next.value;
        break;
      }
      wsSend(ws, { type: "chunk", content: next.value });
      await yieldToEventLoop();
    }

    wsSend(ws, {
      type: "done",
      succeeded: result.succeeded,
      messageId: result.messageId,
      content: result.content,
      model: result.model,
      usage: result.usage,
      cost: result.cost,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    wsSend(ws, { type: "error", message });
  }
}

function wsSend(ws: WsConnection, payload: Record<string, unknown>): void {
  ws.send(JSON.stringify(payload));
}

export function notifySession(sessionId: number, payload: Record<string, unknown>): void {
  const ws = connections.get(sessionId);
  if (ws) wsSend(ws, payload);
}

const yieldToEventLoop = (): Promise<void> => new Promise((r) => setImmediate(r));
