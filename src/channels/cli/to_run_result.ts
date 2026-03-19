import type { TurnResult } from "../../core/chat/api/write/index.ts";
import type { RunResult } from "./run_types.ts";

export function toRunResult(turn: TurnResult): RunResult {
  return {
    succeeded: turn.succeeded,
    content: turn.content,
    model: turn.model,
    tokensIn: turn.usage.inputTokens,
    tokensOut: turn.usage.outputTokens,
    totalTokens: turn.usage.totalTokens,
  };
}
