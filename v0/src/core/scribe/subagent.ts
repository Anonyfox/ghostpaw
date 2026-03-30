import type { Tool } from "chatoyant";
import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { persistTurnMessages } from "../chat/persist_turn.ts";
import { sealSessionTail } from "../chat/seal_session_tail.ts";
import { createSession } from "../chat/session.ts";
import type { SubsystemResult, SubsystemRunOpts } from "../interceptor/registry.ts";
import { renderSoul } from "../souls/render.ts";
import { bridgeCodexTools } from "./bridge.ts";
import { createCodexSkillsTool } from "./skills.ts";

const OBSERVATION_DIRECTIVE = `TASK — The messages above are conversation context \
between a user and the main assistant. You are the Scribe subsystem — an observer, \
not a participant.

Scan for facts, beliefs, preferences, and knowledge worth capturing. Use your tools \
to recall, store, revise, or forget beliefs as appropriate.

Do NOT answer the user's question. Do NOT help with their task. Do NOT write code or \
explanations outside your domain. ONLY maintain the belief store, then write your \
[scribe] summary.

If nothing in the conversation is worth capturing, respond exactly: \
[scribe] Nothing noteworthy this turn.`;

export async function runCodexSubagent(
  opts: SubsystemRunOpts,
  soulsDb: DatabaseHandle,
  scribeId: number,
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

  const codexTools: Tool[] = [...bridgeCodexTools(db), createCodexSkillsTool()];
  const systemPrompt = renderSoul(soulsDb, scribeId);

  const session = createSession(chatDb, model, systemPrompt, {
    purpose: "subsystem_turn",
    parentSessionId,
    triggeredByMessageId: triggerMessageId,
    soulId: scribeId,
  });

  const chat = new Chat({ model });
  chat.system(systemPrompt);
  chat.addMessages(context);
  chat.addMessage(new Message("user", OBSERVATION_DIRECTIVE));
  chat.addTools(codexTools);

  const preCount = chat.messages.length;

  let timer: ReturnType<typeof setTimeout>;
  try {
    await Promise.race([
      chat.generate({ maxIterations }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("subsystem timeout")), timeoutMs);
      }),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { sessionId: session.id, summary: `[scribe] Error: ${msg}`, succeeded: false };
  } finally {
    clearTimeout(timer!);
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

  const fallback = "[scribe] Nothing noteworthy this turn.";

  if (!finalContent) {
    return { sessionId: session.id, summary: fallback, succeeded: true };
  }

  if (!finalContent.includes("[scribe]")) {
    console.error(
      "[interceptor] scribe response violated protocol — discarding off-protocol output",
    );
    return { sessionId: session.id, summary: fallback, succeeded: true };
  }

  return { sessionId: session.id, summary: finalContent, succeeded: true };
}
