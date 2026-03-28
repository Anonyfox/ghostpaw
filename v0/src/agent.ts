import type { Tool } from "chatoyant";
import { executeTurn, streamTurn } from "./core/chat/turn.ts";
import type { Agent, TurnOptions, TurnResult } from "./core/chat/types.ts";
import type { DatabaseHandle } from "./lib/database_handle.ts";

export function createAgent(db: DatabaseHandle, tools: Tool[]): Agent {
  return {
    streamTurn(
      sessionId: number,
      content: string,
      options?: TurnOptions,
    ): AsyncGenerator<string, TurnResult> {
      return streamTurn(db, tools, sessionId, content, options);
    },

    executeTurn(sessionId: number, content: string, options?: TurnOptions): Promise<TurnResult> {
      return executeTurn(db, tools, sessionId, content, options);
    },
  };
}
