import type { DatabaseHandle } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import type { ChatFactory } from "./chat_instance.ts";
import type { ChatMessage } from "./types.ts";

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

  const summary = await chat.generate();
  const lastMsg = history[history.length - 1];

  return addMessage(db, {
    sessionId,
    role: "assistant",
    content: summary,
    parentId: lastMsg?.id,
    model,
    tokensIn: chat.lastResult?.usage.inputTokens ?? 0,
    tokensOut: chat.lastResult?.usage.outputTokens ?? 0,
    costUsd: chat.lastResult?.cost.estimatedUsd ?? 0,
    isCompaction: true,
  });
}
