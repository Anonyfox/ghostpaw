import type { Tool } from "chatoyant";
import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { persistTurnMessages } from "../chat/persist_turn.ts";
import { sealSessionTail } from "../chat/seal_session_tail.ts";
import { createSession } from "../chat/session.ts";
import type { SubsystemResult, SubsystemRunOpts } from "../interceptor/registry.ts";
import { renderSoul } from "../souls/render.ts";
import { bridgeAffinityTools } from "./bridge.ts";
import { createAffinitySkillsTool } from "./skills.ts";

const OBSERVATION_DIRECTIVE = `TASK — The messages above are conversation context \
between a user and the main assistant. You are the Innkeeper subsystem — an observer, \
not a participant.

Scan for people, organizations, teams, relationships, events, and social signals. \
For anything you find:
1. search_affinity — check if the contact already exists
2. manage_contact with action "create" for each NEW person/org (do NOT skip this)
3. manage_relationship to seed links between contacts
4. record_event for notable interactions, observations, or milestones

CRITICAL: Stating "Created" or "Recorded" in your text response does NOT save anything \
to the database. Only tool calls persist data. If you found 5 new people, you need 5 \
separate manage_contact calls.

Do NOT answer the user's question. Do NOT help with their task. Do NOT write code or \
explanations outside your domain. ONLY maintain the social graph, then write your \
[innkeeper] summary of what you actually persisted via tool calls.

If nothing in the conversation involves people or relationships, respond exactly: \
[innkeeper] Nothing noteworthy this turn.`;

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
  chat.addMessage(new Message("user", OBSERVATION_DIRECTIVE));
  chat.addTools(affinityTools);

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
    return { sessionId: session.id, summary: `[innkeeper] Error: ${msg}`, succeeded: false };
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

  const fallback = "[innkeeper] Nothing noteworthy this turn.";

  if (!finalContent) {
    return { sessionId: session.id, summary: fallback, succeeded: true };
  }

  if (!finalContent.includes("[innkeeper]")) {
    console.error(
      "[interceptor] innkeeper response violated protocol — discarding off-protocol output",
    );
    return { sessionId: session.id, summary: fallback, succeeded: true };
  }

  return { sessionId: session.id, summary: finalContent, succeeded: true };
}
