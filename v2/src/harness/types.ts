import type { ChatFactory, ToolCallInfo, ToolResultInfo, TurnResult } from "../core/chat/index.ts";
import type { DelegationRun } from "../core/runs/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";

export interface EntityOptions {
  db: DatabaseHandle;
  workspace: string;
  chatFactory?: ChatFactory;
  onBackgroundComplete?: (parentSessionId: number, run: DelegationRun) => void;
}

export interface EntityTurnOptions {
  model?: string;
  soulId?: number;
  onTitleGenerated?: (title: string) => void;
  onToolCallStart?: (calls: ToolCallInfo[]) => void;
  onToolCallComplete?: (results: ToolResultInfo[]) => void;
}

export interface Entity {
  readonly db: DatabaseHandle;
  readonly workspace: string;

  streamTurn(
    sessionId: number,
    content: string,
    options?: EntityTurnOptions,
  ): AsyncGenerator<string, TurnResult>;

  executeTurn(sessionId: number, content: string, options?: EntityTurnOptions): Promise<TurnResult>;

  /** Await any pending background work (e.g. title generation). Short-lived
   *  callers (CLI oneshot) must call this before closing the database. */
  flush(): Promise<void>;
}
