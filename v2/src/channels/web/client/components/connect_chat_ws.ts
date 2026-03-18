interface WsCallbacks {
  onChunk: (accumulated: string) => void;
  onDone: (messageId: number, content: string, totalTokens: number) => void;
  onError: (msg: string) => void;
  onTitle: (sessionId: number, title: string) => void;
  onToolStart?: (tools: string[]) => void;
  onToolEnd?: () => void;
  onBackgroundComplete?: (runId: number, specialist: string, status: string) => void;
}

export interface ChatWsConnection {
  ready: Promise<void>;
  send: (content: string, model?: string, replyToId?: number) => void;
  close: () => void;
}

const WS_OPEN_TIMEOUT_MS = 5000;

export function connectChatWs(sessionId: number, callbacks: WsCallbacks): ChatWsConnection {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${location.host}/ws/chat/${sessionId}`);

  let accumulated = "";

  const ready = new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, WS_OPEN_TIMEOUT_MS);
    ws.addEventListener(
      "open",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });

  ws.addEventListener("error", () => {
    callbacks.onError("WebSocket connection failed.");
  });

  ws.addEventListener("message", (e) => {
    let msg: { type?: string; content?: string; [k: string]: unknown };
    try {
      msg = JSON.parse(String(e.data));
    } catch {
      return;
    }

    switch (msg.type) {
      case "chunk": {
        const chunk = typeof msg.content === "string" ? msg.content : "";
        accumulated += chunk;
        callbacks.onChunk(accumulated);
        break;
      }
      case "done": {
        const usage = (msg.usage ?? {}) as { totalTokens?: number };
        const finalContent = typeof msg.content === "string" ? msg.content : accumulated;
        callbacks.onDone(msg.messageId as number, finalContent, usage.totalTokens ?? 0);
        accumulated = "";
        break;
      }
      case "error": {
        callbacks.onError(typeof msg.message === "string" ? msg.message : "Unknown error");
        accumulated = "";
        break;
      }
      case "title": {
        callbacks.onTitle(sessionId, msg.title as string);
        break;
      }
      case "tool_start": {
        const tools = Array.isArray(msg.tools) ? (msg.tools as string[]) : [];
        callbacks.onToolStart?.(tools);
        break;
      }
      case "tool_end": {
        callbacks.onToolEnd?.();
        break;
      }
      case "background_complete": {
        callbacks.onBackgroundComplete?.(
          msg.runId as number,
          msg.specialist as string,
          msg.status as string,
        );
        break;
      }
    }
  });

  return {
    ready,
    send(content: string, model?: string, replyToId?: number) {
      if (ws.readyState !== WebSocket.OPEN) {
        callbacks.onError("WebSocket not ready.");
        return;
      }
      const payload: Record<string, unknown> = { type: "send", content };
      if (model) payload.model = model;
      if (replyToId !== undefined) payload.replyToId = replyToId;
      ws.send(JSON.stringify(payload));
    },
    close() {
      ws.close();
    },
  };
}
