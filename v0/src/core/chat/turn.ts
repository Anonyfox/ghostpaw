import type { Tool } from "chatoyant";
import { Chat } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { chatConfigForModel } from "../../lib/detect_provider.ts";
import type { InterceptorConfig } from "../config/config.ts";
import { runInterceptor } from "../interceptor/interceptor.ts";
import type { SubsystemRegistry } from "../interceptor/registry.ts";
import { addMessage } from "./messages.ts";
import { persistTurnMessages } from "./persist_turn.ts";
import { reconstructMessages } from "./reconstruct.ts";
import { getSession } from "./session.ts";
import type { TurnOptions, TurnResult } from "./types.ts";

export interface InterceptorContext {
  registry: SubsystemRegistry;
  config: InterceptorConfig;
  subsystemDbs: Map<string, DatabaseHandle>;
}

function emptyResult(sessionId: number, content: string, model: string): TurnResult {
  return {
    succeeded: false,
    sessionId,
    messageId: -1,
    userMessageId: -1,
    content,
    model,
    usage: { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cachedTokens: 0, totalTokens: 0 },
    cost: { estimatedUsd: 0 },
    iterations: 0,
  };
}

export async function* streamTurn(
  db: DatabaseHandle,
  tools: Tool[],
  sessionId: number,
  content: string,
  options?: TurnOptions,
  interceptor?: InterceptorContext,
): AsyncGenerator<string, TurnResult> {
  const session = getSession(db, sessionId);
  if (!session) return emptyResult(sessionId, "Session not found", "");

  const model = options?.model ?? session.model;
  const userMessageId = addMessage(db, sessionId, "user", content, { source: "organic" });

  if (interceptor && session.purpose === "chat") {
    await runInterceptor({
      chatDb: db,
      subsystemDbs: interceptor.subsystemDbs,
      registry: interceptor.registry,
      config: interceptor.config,
      sessionId,
      triggerMessageId: userMessageId,
      model,
    });
  }

  const history = reconstructMessages(db, sessionId);
  const chat = new Chat(chatConfigForModel(model));
  chat.system(session.system_prompt);
  chat.addMessages(history);
  chat.addTools(tools);

  const preCount = chat.messages.length;

  try {
    const stream = chat.stream({
      maxIterations: options?.maxIterations ?? 25,
      temperature: options?.temperature,
      reasoning: options?.reasoning,
      onToolCallStart: options?.onToolCallStart
        ? (calls) => options.onToolCallStart!(calls.map((c) => ({ id: c.id, name: c.name })))
        : undefined,
      onToolCallComplete: options?.onToolCallComplete
        ? (results) =>
            options.onToolCallComplete!(
              results.map((r) => ({
                callId: r.id,
                name: "",
                success: r.success,
              })),
            )
        : undefined,
    });

    for await (const chunk of stream) {
      yield chunk;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return emptyResult(sessionId, `Error: ${msg}`, model);
  }

  const newMessages = chat.messages.slice(preCount);
  const lastResult = chat.lastResult;

  const lastMessageId = persistTurnMessages(db, sessionId, newMessages, {
    model: lastResult?.model ?? model,
    inputTokens: lastResult?.usage.inputTokens,
    outputTokens: lastResult?.usage.outputTokens,
    cachedTokens: lastResult?.usage.cachedTokens,
    reasoningTokens: lastResult?.usage.reasoningTokens,
    costUsd: lastResult?.cost.estimatedUsd,
  });

  const finalContent =
    newMessages.length > 0 ? (newMessages[newMessages.length - 1].content ?? "") : "";

  return {
    succeeded: true,
    sessionId,
    messageId: lastMessageId,
    userMessageId,
    content: finalContent,
    model: lastResult?.model ?? model,
    usage: {
      inputTokens: lastResult?.usage.inputTokens ?? 0,
      outputTokens: lastResult?.usage.outputTokens ?? 0,
      reasoningTokens: lastResult?.usage.reasoningTokens ?? 0,
      cachedTokens: lastResult?.usage.cachedTokens ?? 0,
      totalTokens: lastResult?.usage.totalTokens ?? 0,
    },
    cost: { estimatedUsd: lastResult?.cost.estimatedUsd ?? 0 },
    iterations: lastResult?.iterations ?? 1,
  };
}

export async function executeTurn(
  db: DatabaseHandle,
  tools: Tool[],
  sessionId: number,
  content: string,
  options?: TurnOptions,
  interceptor?: InterceptorContext,
): Promise<TurnResult> {
  const gen = streamTurn(db, tools, sessionId, content, options, interceptor);
  let result = await gen.next();
  while (!result.done) {
    result = await gen.next();
  }
  return result.value;
}
