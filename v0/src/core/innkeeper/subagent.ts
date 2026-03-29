import { soul } from "@ghostpaw/affinity";
import type { Tool } from "chatoyant";
import { Chat } from "chatoyant";
import { chatConfigForModel } from "../../lib/detect_provider.ts";
import { persistTurnMessages } from "../chat/persist_turn.ts";
import { createSession } from "../chat/session.ts";
import type { SubsystemResult, SubsystemRunOpts } from "../interceptor/registry.ts";
import { bridgeAffinityTools } from "./bridge.ts";
import { createAffinitySkillsTool } from "./skills.ts";

const OUTPUT_FORMAT_INSTRUCTIONS = `
When you finish processing, respond with a clear summary of what you found and what you did. Structure it as:

[innkeeper]
Recalled: {contacts and relationships you found relevant, each with name, #id, and key details}
Created: {new contacts you created, each with name, kind, and #id}
Updated: {bonds, identities, attributes, or lifecycle changes, each with #id and what changed}
Recorded: {interactions, milestones, observations, or commitments noted, each with type and who was involved}
Question: {anything ambiguous, worth asking the user about, or worth the main conversation exploring — write the full reasoning, not just a hint}
Note: {observations that don't fit the above but are worth surfacing}

Omit any section that has nothing to report. Write in clear, natural language. Be brief when little happened, thorough when much did. Every question and note must be fully self-contained — the reader has no context about your reasoning process.

If nothing was noteworthy this turn, respond: [innkeeper] Nothing noteworthy this turn.`;

function buildSystemPrompt(): string {
  const soulPrompt = soul.renderAffinitySoulPromptFoundation();
  return (
    soulPrompt +
    "\n\n---\n\n" +
    "You are the Innkeeper — the one who knows every face and every story. You run as an automatic " +
    "subsystem within a conversation between a user and a main assistant. " +
    "You will receive the latest conversation context. Your job is to maintain the social graph: " +
    "search for existing contacts when people are mentioned, create new ones when someone appears " +
    "for the first time, record interactions and observations, update relationships, and surface " +
    "anything the main conversation should know about the people involved. " +
    "SEARCH FIRST — always check if a contact already exists before creating a new one." +
    OUTPUT_FORMAT_INSTRUCTIONS
  );
}

export async function runAffinitySubagent(opts: SubsystemRunOpts): Promise<SubsystemResult> {
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
  const systemPrompt = buildSystemPrompt();

  const session = createSession(chatDb, model, systemPrompt, {
    purpose: "subsystem_turn",
    parentSessionId,
    triggeredByMessageId: triggerMessageId,
  });

  const chat = new Chat(chatConfigForModel(model));
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

  return {
    sessionId: session.id,
    summary: finalContent || "[innkeeper] Nothing noteworthy this turn.",
    succeeded: true,
  };
}
