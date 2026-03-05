import { acquireSessionLock } from "./acquire_session_lock.ts";
import { addMessage } from "./add_message.ts";
import { buildChat } from "./build_chat.ts";
import type { TurnContext } from "./chat_instance.ts";
import { estimateTokens } from "./estimate_tokens.ts";
import { getHistory } from "./get_history.ts";
import { getSession } from "./get_session.ts";
import { persistToolMessages } from "./persist_tool_messages.ts";
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

    // Compact BEFORE adding user message so the summary precedes it in the chain.
    // Otherwise the compaction assistant message ends up after the user message,
    // and getHistory returns only the summary — leaving no user message for the LLM.
    if (input.compactionThreshold && input.compactionThreshold > 0 && ctx.compactFn) {
      const preHistory = getHistory(ctx.db, input.sessionId);
      if (shouldCompact(preHistory, input.compactionThreshold)) {
        await ctx.compactFn(ctx.db, input.sessionId, preHistory, input.model, ctx.createChat);
      }
    }

    const freshSession = getSession(ctx.db, input.sessionId);
    addMessage(ctx.db, {
      sessionId: input.sessionId,
      role: "user",
      content: input.content,
      parentId: freshSession?.headMessageId ?? undefined,
      tokensIn: estimateTokens(input.content),
    });

    const history = getHistory(ctx.db, input.sessionId);
    const chat = buildChat(history, input.systemPrompt, input.model, ctx.tools, ctx.createChat);
    const preGenerateCount = chat.messages.length;

    let text: string;
    let succeeded = true;
    try {
      text = await chat.generate({
        cache: true,
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
      succeeded = false;
    }

    if (input.abortSignal?.aborted) {
      throw new Error("Turn aborted");
    }

    const toolMessages = chat.messages.slice(preGenerateCount, -1);
    let currentHead = getSession(ctx.db, input.sessionId)?.headMessageId ?? null;
    if (toolMessages.length > 0) {
      currentHead = persistToolMessages(ctx.db, input.sessionId, toolMessages, currentHead);
    }

    const lastResult = succeeded ? chat.lastResult : null;
    return recordTurn(
      ctx.db,
      input.sessionId,
      text,
      lastResult,
      input.model,
      currentHead,
      succeeded,
    );
  } finally {
    release();
  }
}
