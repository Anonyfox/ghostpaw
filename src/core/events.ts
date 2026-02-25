export type AgentEventMap = {
  "run:start": { runId: string; sessionId: string; agent: string; prompt: string };
  "run:end": { runId: string; sessionId: string; text: string | null };
  "run:error": { runId: string; sessionId: string; error: string };
  "stream:chunk": { sessionId: string; chunk: string };
  "delegate:spawn": {
    parentSessionId: string;
    childRunId: string;
    agent: string;
  };
  "delegate:done": {
    childRunId: string;
    status: string;
    result: string | null;
  };
  "delegate:auto-result": {
    sessionId: string;
    sessionKey: string;
    agent: string;
    text: string | null;
  };
};

type Handler = (data: never) => void;

export interface EventBus {
  on<K extends keyof AgentEventMap>(event: K, handler: (data: AgentEventMap[K]) => void): void;
  off<K extends keyof AgentEventMap>(event: K, handler: (data: AgentEventMap[K]) => void): void;
  emit<K extends keyof AgentEventMap>(event: K, data: AgentEventMap[K]): void;
}

export function createEventBus(): EventBus {
  const handlers = new Map<string, Set<Handler>>();

  return {
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler as Handler);
    },

    off(event, handler) {
      handlers.get(event)?.delete(handler as Handler);
    },

    emit(event, data) {
      const set = handlers.get(event);
      if (!set) return;
      for (const fn of set) {
        try {
          (fn as (data: unknown) => void)(data);
        } catch {
          // fail-open: handler errors must not break the emitter
        }
      }
    },
  };
}
