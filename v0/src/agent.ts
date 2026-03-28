import type { Tool } from "chatoyant";
import type { InterceptorContext } from "./core/chat/turn.ts";
import { executeTurn, streamTurn } from "./core/chat/turn.ts";
import type { Agent, TurnOptions, TurnResult } from "./core/chat/types.ts";
import type { DatabaseHandle } from "./lib/database_handle.ts";

export interface CreateAgentOptions {
  db: DatabaseHandle;
  tools: Tool[];
  interceptor?: InterceptorContext;
}

export function createAgent(opts: CreateAgentOptions): Agent {
  const { db, tools, interceptor } = opts;

  return {
    streamTurn(
      sessionId: number,
      content: string,
      options?: TurnOptions,
    ): AsyncGenerator<string, TurnResult> {
      return streamTurn(db, tools, sessionId, content, options, interceptor);
    },

    executeTurn(sessionId: number, content: string, options?: TurnOptions): Promise<TurnResult> {
      return executeTurn(db, tools, sessionId, content, options, interceptor);
    },
  };
}
