import type { DatabaseHandle } from "../../lib/index.ts";
import { accumulateUsage } from "./accumulate_usage.ts";
import { addMessage } from "./add_message.ts";
import { estimateTokens } from "./estimate_tokens.ts";
import type { TurnResult } from "./types.ts";

interface LastResult {
  usage: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cachedTokens: number;
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
  userMessageId: number,
  succeeded = true,
): TurnResult {
  const estimatedTokens = estimateTokens(content);
  const tokensIn = lastResult?.usage.inputTokens ?? (succeeded ? estimatedTokens : 0);
  const tokensOut = lastResult?.usage.outputTokens ?? (succeeded ? estimatedTokens : 0);
  const reasoningTokens = lastResult?.usage.reasoningTokens ?? 0;
  const cachedTokens = lastResult?.usage.cachedTokens ?? 0;
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
    reasoningTokens,
    cachedTokens,
    costUsd,
  });

  accumulateUsage(db, sessionId, {
    tokensIn,
    tokensOut,
    reasoningTokens,
    cachedTokens,
    costUsd,
  });

  return {
    succeeded,
    messageId: message.id,
    userMessageId,
    content,
    model: realModel,
    usage: {
      inputTokens: tokensIn,
      outputTokens: tokensOut,
      reasoningTokens,
      cachedTokens,
      totalTokens: tokensIn + tokensOut,
    },
    cost: { estimatedUsd: costUsd },
    iterations,
  };
}
