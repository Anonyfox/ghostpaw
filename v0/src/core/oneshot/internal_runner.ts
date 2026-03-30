import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { addMessage } from "../chat/messages.ts";
import { createSession } from "../chat/session.ts";
import type { SessionPurpose } from "../chat/types.ts";

export interface InternalOneshotOpts {
  db: DatabaseHandle;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  purpose?: SessionPurpose;
  parentSessionId?: number;
  title?: string;
}

export interface InternalOneshotResult {
  sessionId: number;
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    reasoningTokens: number;
    costUsd: number;
  };
}

export async function runInternalOneshot(
  opts: InternalOneshotOpts,
): Promise<InternalOneshotResult> {
  const session = createSession(opts.db, opts.model, opts.systemPrompt, {
    purpose: opts.purpose ?? "system",
    title: opts.title,
    parentSessionId: opts.parentSessionId,
  });

  addMessage(opts.db, session.id, "user", opts.userPrompt);

  const chat = new Chat({ model: opts.model });
  chat.system(opts.systemPrompt);
  chat.addMessage(new Message("user", opts.userPrompt));

  const content = (await chat.generate({ maxIterations: 1 })) ?? "";
  const lr = chat.lastResult;
  const inputTokens = lr?.usage.inputTokens ?? 0;
  const outputTokens = lr?.usage.outputTokens ?? 0;
  const cachedTokens = lr?.usage.cachedTokens ?? 0;
  const reasoningTokens = lr?.usage.reasoningTokens ?? 0;
  const costUsd = lr?.cost.estimatedUsd ?? 0;

  addMessage(opts.db, session.id, "assistant", content, {
    model: lr?.model ?? opts.model,
    inputTokens,
    outputTokens,
    cachedTokens,
    reasoningTokens,
    costUsd,
  });

  return {
    sessionId: session.id,
    content,
    usage: { inputTokens, outputTokens, cachedTokens, reasoningTokens, costUsd },
  };
}
