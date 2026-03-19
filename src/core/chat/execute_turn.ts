import { acquireSessionLock } from "./acquire_session_lock.ts";
import { addMessage } from "./add_message.ts";
import { buildChat } from "./build_chat.ts";
import type { TurnContext } from "./chat_instance.ts";
import { estimateTokens } from "./estimate_tokens.ts";
import { getHistory } from "./get_history.ts";
import { getSession } from "./get_session.ts";
import { persistToolMessages } from "./persist_tool_messages.ts";
import { recordTurn } from "./record_turn.ts";
import { resolveReplyQuotes } from "./resolve_reply_quotes.ts";
import { shouldCompact } from "./should_compact.ts";
import type { TurnInput, TurnResult } from "./types.ts";

const DEFAULT_MAX_ITERATIONS = 20;
const DEFAULT_TOOL_TIMEOUT = 600_000;

type AbortableTurnInput = TurnInput & { abortSignal?: AbortSignal };

export async function executeTurn(
  input: AbortableTurnInput,
  ctx: TurnContext,
): Promise<TurnResult> {
  const release = await acquireSessionLock(input.sessionId);
  try {
    const session = getSession(ctx.db, input.sessionId);
    if (!session) throw new Error(`Session ${input.sessionId} not found`);

    let headId = session.headMessageId;

    const threshold = input.compactionThreshold ?? 0;
    if (ctx.compactFn && threshold > 0) {
      const preHistory = getHistory(ctx.db, input.sessionId);
      if (shouldCompact(preHistory, threshold)) {
        await ctx.compactFn(ctx.db, input.sessionId, preHistory, input.model, ctx.createChat);
        headId = getSession(ctx.db, input.sessionId)?.headMessageId ?? null;
      }
    }

    const userMsg = addMessage(ctx.db, {
      sessionId: input.sessionId,
      role: "user",
      content: input.content,
      parentId: headId ?? undefined,
      tokensIn: estimateTokens(input.content),
      replyToId: input.replyToId,
    });

    const rawHistory = getHistory(ctx.db, input.sessionId);
    const history = resolveReplyQuotes(ctx.db, rawHistory);
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
      let errMsg = err instanceof Error ? err.message : String(err);
      if (!errMsg && err && typeof err === "object") {
        const e = err as Record<string, unknown>;
        errMsg = `API error (HTTP ${e.status ?? "unknown"})`;
      }
      text = `Error: ${errMsg}`;
      succeeded = false;
    }

    if (input.abortSignal?.aborted) throw new Error("Turn aborted");

    const toolMessages = chat.messages.slice(preGenerateCount, -1);
    let currentHead: number | null = userMsg.id;
    if (toolMessages.length > 0) {
      currentHead = persistToolMessages(ctx.db, input.sessionId, toolMessages, currentHead);
    }

    return recordTurn(
      ctx.db,
      input.sessionId,
      text,
      succeeded ? chat.lastResult : null,
      input.model,
      currentHead,
      userMsg.id,
      succeeded,
    );
  } finally {
    release();
  }
}
