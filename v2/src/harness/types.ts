import type { Tool } from "chatoyant";
import type {
  ChatFactory,
  ToolCallInfo,
  ToolResultInfo,
  TurnResult,
} from "../core/chat/api/write/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";

export interface DelegationOutcome {
  childSessionId: number;
  parentSessionId: number;
  specialist: string;
  status: "completed" | "failed";
  result: string | null;
  error: string | null;
}

export interface EntityOptions {
  db: DatabaseHandle;
  workspace: string;
  chatFactory?: ChatFactory;
  onBackgroundComplete?: (parentSessionId: number, outcome: DelegationOutcome) => void;
}

export interface EntityTurnOptions {
  model?: string;
  soulId?: number;
  tools?: Tool[];
  systemPrompt?: string;
  maxIterations?: number;
  temperature?: number;
  reasoning?: "off" | "low" | "medium" | "high";
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
