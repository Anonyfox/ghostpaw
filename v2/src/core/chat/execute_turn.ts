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

export async function executeTurn(input: TurnInput, ctx: TurnContext): Promise<TurnResult> {
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

    let text: string;
    try {
      text = await chat.generate({
        maxIterations: input.maxIterations ?? DEFAULT_MAX_ITERATIONS,
        onToolError: "respond",
        toolTimeout: input.toolTimeout ?? DEFAULT_TOOL_TIMEOUT,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        reasoning: input.reasoning,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      text = `Error: ${errorMsg}`;
    }

    const currentHead = getSession(ctx.db, input.sessionId)?.headMessageId ?? null;
    return recordTurn(ctx.db, input.sessionId, text, chat.lastResult, input.model, currentHead);
  } finally {
    release();
  }
}
