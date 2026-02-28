import type { DatabaseHandle } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { estimateTokens } from "./estimate_tokens.ts";
import type { TurnResult } from "./types.ts";

interface LastResult {
  usage: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    totalTokens: number;
  };
  cost: { estimatedUsd: number };
  model: string;
  iterations: number;
}

export function recordTurn(
  db: DatabaseHandle,
  sessionId: number,
  content: string,
  lastResult: LastResult | null,
  model: string,
  parentId: number | null,
): TurnResult {
  const tokensIn = lastResult?.usage.inputTokens ?? estimateTokens(content);
  const tokensOut = lastResult?.usage.outputTokens ?? estimateTokens(content);
  const reasoningTokens = lastResult?.usage.reasoningTokens ?? 0;
  const costUsd = lastResult?.cost.estimatedUsd ?? 0;
  const realModel = lastResult?.model ?? model;
  const iterations = lastResult?.iterations ?? 1;

  const message = addMessage(db, {
    sessionId,
    role: "assistant",
    content,
    parentId: parentId ?? undefined,
    model: realModel,
    tokensIn,
    tokensOut,
    costUsd,
  });

  db.prepare(
    `UPDATE sessions
     SET tokens_in = tokens_in + ?,
         tokens_out = tokens_out + ?,
         cost_usd = cost_usd + ?
     WHERE id = ?`,
  ).run(tokensIn, tokensOut, costUsd, sessionId);

  return {
    messageId: message.id,
    content,
    model: realModel,
    usage: {
      inputTokens: tokensIn,
      outputTokens: tokensOut,
      reasoningTokens,
      totalTokens: tokensIn + tokensOut,
    },
    cost: { estimatedUsd: costUsd },
    iterations,
  };
}
