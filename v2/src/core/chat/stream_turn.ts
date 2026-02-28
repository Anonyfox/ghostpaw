import { acquireSessionLock } from "./acquire_session_lock.ts";
import { addMessage } from "./add_message.ts";
import { buildChat } from "./build_chat.ts";
import type { TurnContext } from "./chat_instance.ts";
import { compactHistory } from "./compact_history.ts";
import { estimateTokens } from "./estimate_tokens.ts";
import { getHistory } from "./get_history.ts";
import { getSession } from "./get_session.ts";
import { recordTurn } from "./record_turn.ts";
import { shouldCompact } from "./should_compact.ts";
import type { TurnInput, TurnResult } from "./types.ts";

const DEFAULT_MAX_ITERATIONS = 20;
const DEFAULT_TOOL_TIMEOUT = 600_000;

export async function* streamTurn(
  input: TurnInput,
  ctx: TurnContext,
): AsyncGenerator<string, TurnResult> {
  const release = await acquireSessionLock(input.sessionId);
  try {
    const session = getSession(ctx.db, input.sessionId);
    if (!session) {
      throw new Error(`Session ${input.sessionId} not found`);
    }

    addMessage(ctx.db, {
      sessionId: input.sessionId,
      role: "user",
      content: input.content,
      parentId: session.headMessageId ?? undefined,
      tokensIn: estimateTokens(input.content),
    });

    let history = getHistory(ctx.db, input.sessionId);

    if (
      input.compactionThreshold !== undefined &&
      input.compactionThreshold > 0 &&
      shouldCompact(history, input.compactionThreshold)
    ) {
      await compactHistory(ctx.db, input.sessionId, history, input.model, ctx.createChat);
      history = getHistory(ctx.db, input.sessionId);
    }

    const chat = buildChat(history, input.systemPrompt, input.model, ctx.tools, ctx.createChat);

    let fullText = "";
    try {
      for await (const chunk of chat.stream({
        maxIterations: input.maxIterations ?? DEFAULT_MAX_ITERATIONS,
        onToolError: "respond",
        toolTimeout: input.toolTimeout ?? DEFAULT_TOOL_TIMEOUT,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        reasoning: input.reasoning,
      })) {
        fullText += chunk;
        yield chunk;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!fullText) fullText = `Error: ${msg}`;
    }

    const currentHead = getSession(ctx.db, input.sessionId)?.headMessageId ?? null;
    return recordTurn(ctx.db, input.sessionId, fullText, chat.lastResult, input.model, currentHead);
  } finally {
    release();
  }
}
