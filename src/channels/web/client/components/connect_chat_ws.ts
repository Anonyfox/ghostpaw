export interface CommandResultPayload {
  text: string;
  action: { type: string; [k: string]: unknown } | null;
}

interface WsCallbacks {
  onChunk: (accumulated: string) => void;
  onDone: (messageId: number, content: string, totalTokens: number) => void;
  onError: (msg: string) => void;
  onTitle: (sessionId: number, title: string) => void;
  onCommandResult?: (result: CommandResultPayload) => void;
  onToolStart?: (tools: string[]) => void;
  onToolEnd?: () => void;
  onBackgroundComplete?: (runId: number, specialist: string, status: string) => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
}

export interface ChatWsConnection {
  ready: Promise<void>;
  send: (content: string, model?: string, replyToId?: number) => void;
  close: () => void;
}

const WS_OPEN_TIMEOUT_MS = 5000;
const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 30_000;

export function connectChatWs(sessionId: number, callbacks: WsCallbacks): ChatWsConnection {
  let ws: WebSocket;
  let accumulated = "";
  let intentionalClose = false;
  let reconnectDelay = RECONNECT_BASE_MS;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let currentReady: Promise<void>;
  let resolveReady: (() => void) | null = null;

  function makeReady(): Promise<void> {
    return new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
  }

  function wireWs(socket: WebSocket): void {
    socket.addEventListener(
      "open",
      () => {
        reconnectDelay = RECONNECT_BASE_MS;
        resolveReady?.();
        resolveReady = null;
      },
      { once: true },
    );

    socket.addEventListener("error", () => {
      if (!intentionalClose) callbacks.onError("WebSocket connection failed.");
    });

    socket.addEventListener("close", (e) => {
      if (intentionalClose || e.code === 1000) return;
      callbacks.onReconnecting?.();
      scheduleReconnect();
    });

    socket.addEventListener("message", (e) => {
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
        case "command_result": {
          callbacks.onCommandResult?.({
            text: typeof msg.text === "string" ? msg.text : "",
            action: (msg.action as CommandResultPayload["action"]) ?? null,
          });
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
  }

  function createWs(): WebSocket {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    return new WebSocket(`${protocol}//${location.host}/ws/chat/${sessionId}`);
  }

  function scheduleReconnect(): void {
    clearTimeout(reconnectTimer);
    const jitter = Math.random() * 500;
    reconnectTimer = setTimeout(() => {
      if (intentionalClose) return;
      currentReady = makeReady();
      ws = createWs();
      wireWs(ws);

      ws.addEventListener(
        "open",
        () => {
          callbacks.onReconnected?.();
        },
        { once: true },
      );

      reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
    }, reconnectDelay + jitter);
  }

  currentReady = makeReady();

  const openTimeout = setTimeout(() => {
    resolveReady?.();
    resolveReady = null;
  }, WS_OPEN_TIMEOUT_MS);

  ws = createWs();
  wireWs(ws);
  ws.addEventListener(
    "open",
    () => {
      clearTimeout(openTimeout);
    },
    { once: true },
  );

  return {
    get ready() {
      return currentReady;
    },
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
      intentionalClose = true;
      clearTimeout(reconnectTimer);
      ws.close();
    },
  };
}
