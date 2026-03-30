import type { Tool } from "chatoyant";
import { Chat } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { persistTurnMessages } from "../chat/persist_turn.ts";
import { sealSessionTail } from "../chat/seal_session_tail.ts";
import { createSession } from "../chat/session.ts";
import type { SubsystemResult, SubsystemRunOpts } from "../interceptor/registry.ts";
import { renderSoul } from "../souls/render.ts";
import { bridgeAffinityTools } from "./bridge.ts";
import { createAffinitySkillsTool } from "./skills.ts";

export async function runAffinitySubagent(
  opts: SubsystemRunOpts,
  soulsDb: DatabaseHandle,
  innkeeperId: number,
): Promise<SubsystemResult> {
  const {
    db,
    chatDb,
    parentSessionId,
    triggerMessageId,
    context,
    model,
    maxIterations,
    timeoutMs,
  } = opts;

  const affinityTools: Tool[] = [...bridgeAffinityTools(db), createAffinitySkillsTool()];
  const systemPrompt = renderSoul(soulsDb, innkeeperId);

  const session = createSession(chatDb, model, systemPrompt, {
    purpose: "subsystem_turn",
    parentSessionId,
    triggeredByMessageId: triggerMessageId,
    soulId: innkeeperId,
  });

  const chat = new Chat({ model });
  chat.system(systemPrompt);
  chat.addMessages(context);
  chat.addTools(affinityTools);

  const preCount = chat.messages.length;

  try {
    await Promise.race([
      chat.generate({ maxIterations }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("subsystem timeout")), timeoutMs),
      ),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { sessionId: session.id, summary: `[innkeeper] Error: ${msg}`, succeeded: false };
  }

  const newMessages = chat.messages.slice(preCount);
  const lastResult = chat.lastResult;

  persistTurnMessages(chatDb, session.id, newMessages, {
    model: lastResult?.model ?? model,
    inputTokens: lastResult?.usage.inputTokens,
    outputTokens: lastResult?.usage.outputTokens,
    cachedTokens: lastResult?.usage.cachedTokens,
    reasoningTokens: lastResult?.usage.reasoningTokens,
    costUsd: lastResult?.cost.estimatedUsd,
  });

  const finalContent =
    newMessages.length > 0 ? (newMessages[newMessages.length - 1].content ?? "") : "";

  sealSessionTail(chatDb, session.id);

  return {
    sessionId: session.id,
    summary: finalContent || "[innkeeper] Nothing noteworthy this turn.",
    succeeded: true,
  };
}
