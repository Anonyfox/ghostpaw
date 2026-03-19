import type { ChatMessage } from "../../core/chat/api/read/index.ts";
import { accumulateUsage, addMessage, type ChatFactory } from "../../core/chat/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

const COMPACT_SYSTEM_PROMPT = [
  "You are a conversation summarizer. Your job is to produce a concise summary",
  "of the conversation so far. Preserve all important facts, decisions, user",
  "preferences, and action items. Omit pleasantries and filler. The summary",
  "will replace the conversation history, so nothing important should be lost.",
  "Write in third person. Be thorough but concise.",
].join(" ");

function formatHistoryForCompaction(history: ChatMessage[]): string {
  return history.map((m) => `${m.role}: ${m.content}`).join("\n\n");
}

export async function compactHistory(
  db: DatabaseHandle,
  sessionId: number,
  history: ChatMessage[],
  model: string,
  createChat: ChatFactory,
): Promise<ChatMessage> {
  const chat = createChat(model);
  chat.system(COMPACT_SYSTEM_PROMPT);
  chat.user(formatHistoryForCompaction(history));

  const summary = await chat.generate({ cache: true });
  const lastMsg = history[history.length - 1];
  const lr = chat.lastResult;

  const tokensIn = lr?.usage.inputTokens ?? 0;
  const tokensOut = lr?.usage.outputTokens ?? 0;
  const reasoningTokens = lr?.usage.reasoningTokens ?? 0;
  const cachedTokens = lr?.usage.cachedTokens ?? 0;
  const costUsd = lr?.cost.estimatedUsd ?? 0;

  const msg = addMessage(db, {
    sessionId,
    role: "assistant",
    content: summary,
    parentId: lastMsg?.id,
    model,
    tokensIn,
    tokensOut,
    reasoningTokens,
    cachedTokens,
    costUsd,
    isCompaction: true,
  });

  accumulateUsage(db, sessionId, {
    tokensIn,
    tokensOut,
    reasoningTokens,
    cachedTokens,
    costUsd,
  });

  return msg;
}
