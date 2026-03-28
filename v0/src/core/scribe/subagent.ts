import { soul } from "@ghostpaw/codex";
import type { Tool } from "chatoyant";
import { Chat } from "chatoyant";
import { chatConfigForModel } from "../../lib/detect_provider.ts";
import { persistTurnMessages } from "../chat/persist_turn.ts";
import { createSession } from "../chat/session.ts";
import type { SubsystemResult, SubsystemRunOpts } from "../interceptor/registry.ts";
import { bridgeCodexTools } from "./bridge.ts";
import { createCodexSkillsTool } from "./skills.ts";

const OUTPUT_FORMAT_INSTRUCTIONS = `
When you finish processing, respond with a clear summary of what you found and what you did. Structure it as:

[scribe]
Recalled: {beliefs you found relevant, each with their claim text, #id, and confidence}
Stored: {new beliefs you created, each with their claim text and #id}
Updated: {beliefs you revised, each with their claim text, #id, and what changed}
Forgotten: {beliefs you removed from active recall, each with #id and why}
Question: {anything ambiguous, worth asking the user about, or worth the main conversation exploring — write the full reasoning, not just a hint}
Note: {observations that don't fit the above but are worth surfacing}

Omit any section that has nothing to report. Write in clear, natural language. Be brief when little happened, thorough when much did. Every question and note must be fully self-contained — the reader has no context about your reasoning process.

If nothing was noteworthy this turn, respond: [scribe] Nothing noteworthy this turn.`;

function buildSystemPrompt(): string {
  const soulPrompt = soul.renderCodexSoulPromptFoundation();
  return (
    soulPrompt +
    "\n\n---\n\n" +
    "You are the Scribe — the keeper of the written record. You run as an automatic subsystem " +
    "within a conversation between a user and a main assistant. " +
    "You will receive the latest conversation context. Your job is to maintain the belief store: " +
    "recall relevant beliefs, store new ones, revise outdated ones, and surface anything the main " +
    "conversation should know about." +
    OUTPUT_FORMAT_INSTRUCTIONS
  );
}

export async function runCodexSubagent(opts: SubsystemRunOpts): Promise<SubsystemResult> {
  const { codexDb, chatDb, parentSessionId, triggerMessageId, context, model, timeoutMs } = opts;

  const codexTools: Tool[] = [...bridgeCodexTools(codexDb), createCodexSkillsTool()];
  const systemPrompt = buildSystemPrompt();

  const session = createSession(chatDb, model, systemPrompt, {
    purpose: "subsystem_turn",
    parentSessionId,
    triggeredByMessageId: triggerMessageId,
  });

  const chat = new Chat(chatConfigForModel(model));
  chat.system(systemPrompt);
  chat.addMessages(context);
  chat.addTools(codexTools);

  const preCount = chat.messages.length;

  try {
    await chat.generate({ maxIterations: 15 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { sessionId: session.id, summary: `[scribe] Error: ${msg}`, succeeded: false };
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
    summary: finalContent || "[scribe] Nothing noteworthy this turn.",
    succeeded: true,
  };
}
