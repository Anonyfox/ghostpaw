interface SseCallbacks {
  onChunk: (accumulated: string) => void;
  onDone: (messageId: number, content: string, totalTokens: number) => void;
  onError: (msg: string) => void;
  onTitle: (sessionId: number, title: string) => void;
}

interface SseConnection {
  ready: Promise<void>;
  eventSource: EventSource;
}

const SSE_OPEN_TIMEOUT_MS = 5000;

export function connectChatSse(sessionId: number, callbacks: SseCallbacks): SseConnection {
  let accumulated = "";
  const es = new EventSource(`/api/chat/${sessionId}/stream`);

  const ready = new Promise<void>((resolve) => {
    es.onopen = () => resolve();
    setTimeout(resolve, SSE_OPEN_TIMEOUT_MS);
  });

  es.onmessage = (e: MessageEvent) => {
    const chunk = JSON.parse(e.data) as string;
    accumulated += chunk;
    callbacks.onChunk(accumulated);
  };

  es.addEventListener("done", (e: Event) => {
    const data = JSON.parse((e as MessageEvent).data);
    const usage = data.usage as { totalTokens: number };
    callbacks.onDone(data.messageId as number, accumulated, usage.totalTokens);
    accumulated = "";
  });

  es.addEventListener("error", (e: Event) => {
    if (es.readyState === EventSource.CLOSED) return;
    const me = e as MessageEvent;
    if (me.data) {
      callbacks.onError(JSON.parse(me.data) as string);
    }
    accumulated = "";
  });

  es.addEventListener("title", (e: Event) => {
    const title = JSON.parse((e as MessageEvent).data) as string;
    callbacks.onTitle(sessionId, title);
  });

  return { ready, eventSource: es };
}
