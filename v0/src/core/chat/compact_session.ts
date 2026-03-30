import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { runInternalOneshot } from "../oneshot/internal_runner.ts";
import { addMessage } from "./messages.ts";
import { reconstructActiveHistory } from "./reconstruct.ts";
import { sealMessage } from "./seal_message.ts";
import { shouldCompact } from "./should_compact.ts";

const COMPACT_SYSTEM_PROMPT = [
  "You are a conversation summarizer. Produce a concise summary of the conversation so far.",
  "Preserve all important facts, decisions, user preferences, and action items.",
  "Omit pleasantries and filler. The summary will replace the conversation history,",
  "so nothing important should be lost. Write in third person. Be thorough but concise.",
].join(" ");

function formatHistoryForCompaction(history: { role: string; content: string }[]): string {
  return history.map((m) => `${m.role}: ${m.content ?? ""}`).join("\n\n");
}

export async function compactSession(
  db: DatabaseHandle,
  sessionId: number,
  model: string,
  threshold: number,
): Promise<number | null> {
  const history = reconstructActiveHistory(db, sessionId);

  if (!shouldCompact(history, threshold)) {
    return null;
  }

  const lastMsg = db
    .prepare("SELECT id FROM messages WHERE session_id = ? ORDER BY ordinal DESC LIMIT 1")
    .get(sessionId) as { id: number } | undefined;

  const userPrompt = formatHistoryForCompaction(
    history.map((m) => ({ role: m.role, content: m.content ?? "" })),
  );

  const oneshotResult = await runInternalOneshot({
    db,
    model,
    systemPrompt: COMPACT_SYSTEM_PROMPT,
    userPrompt,
    purpose: "system",
    parentSessionId: sessionId,
    title: `compaction:${sessionId}`,
  });

  const compactionMsgId = addMessage(db, sessionId, "assistant", oneshotResult.content, {
    source: "synthetic",
    parentId: lastMsg?.id,
    isCompaction: true,
    model,
    inputTokens: oneshotResult.usage.inputTokens,
    outputTokens: oneshotResult.usage.outputTokens,
    cachedTokens: oneshotResult.usage.cachedTokens,
    reasoningTokens: oneshotResult.usage.reasoningTokens,
    costUsd: oneshotResult.usage.costUsd,
  });

  db.prepare("UPDATE sessions SET head_message_id = ? WHERE id = ?").run(
    compactionMsgId,
    sessionId,
  );

  if (lastMsg) {
    sealMessage(db, lastMsg.id);
  }

  return compactionMsgId;
}
