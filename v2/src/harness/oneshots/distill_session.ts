import {
  accumulateUsage,
  closeSession,
  createSession,
  executeTurn,
  getHistory,
  getSession,
  markDistilled,
} from "../../core/chat/index.ts";
import type { ChatFactory } from "../../core/chat/chat_instance.ts";
import { formatConversation } from "../../core/memory/format_conversation.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import {
  createForgetTool,
  createRecallTool,
  createRememberTool,
  createReviseTool,
} from "../../tools/memory/index.ts";
import type { DistillResult, DistillToolCalls } from "../distill_types.ts";
import {
  ELIGIBLE_PURPOSES,
  MAX_DISTILL_ITERATIONS,
  MIN_CONVERSATION_LENGTH,
  MIN_SUBSTANTIVE_MESSAGES,
} from "../distill_types.ts";

const DISTILL_SYSTEM_PROMPT = `You are the memory distillation process. You analyze a completed conversation and update the belief system with anything worth remembering long-term.

A belief is a discrete data point: "The user prefers ESM over CJS" — not a personality model like "The user cares about modern tooling."

YOUR WORKFLOW — for each potential belief:
1. Formulate the belief as a clear, self-contained claim
2. Call recall to check if similar beliefs already exist
3. Based on recall results, take the RIGHT action:
   - New belief, nothing similar → remember (with source and category)
   - Reinforces an existing belief → revise with just the ID (confirm mode)
   - Contradicts or updates an existing belief → revise with ID + corrected claim
   - Multiple fragmented memories cover same topic → revise with all IDs + merged claim
   - Existing belief now clearly wrong → forget it

CATEGORIES for remember:
- preference: User likes, dislikes, preferences
- fact: Information about user, projects, environment
- procedure: How to do something (commands, workflows, configs)
- capability: What can/cannot be done, constraints discovered
- custom: Anything else worth remembering

SOURCE for remember:
- explicit: User directly stated it in the conversation
- observed: Clearly demonstrated through actions or evidence
- inferred: Implied or concluded from indirect context

QUALITY RULES:
- Each claim must be self-contained and useful WITHOUT the original conversation
- Include specifics: names, commands, paths, versions
- Corrections and updates are highest priority — they fix stale beliefs
- Skip: greetings, status checks, obvious facts, tool output noise
- Do nothing if the conversation was routine with nothing notable
- Maximum ~5 beliefs per conversation — quality over quantity
- When confirming via revise, only confirm if the belief is truly reinforced`;

function skip(reason: string): DistillResult {
  return { skipped: true, reason, toolCalls: { recall: 0, remember: 0, revise: 0, forget: 0 } };
}

function countToolCalls(db: DatabaseHandle, systemSessionId: number): DistillToolCalls {
  const counts: DistillToolCalls = { recall: 0, remember: 0, revise: 0, forget: 0 };
  const messages = getHistory(db, systemSessionId);

  for (const msg of messages) {
    if (msg.role !== "tool_call" || !msg.toolData) continue;
    try {
      const data = JSON.parse(msg.toolData) as { name?: string };
      const name = data.name;
      if (name === "recall") counts.recall++;
      else if (name === "remember") counts.remember++;
      else if (name === "revise") counts.revise++;
      else if (name === "forget") counts.forget++;
    } catch {
      // malformed tool_data, skip
    }
  }
  return counts;
}

export async function distillSession(
  db: DatabaseHandle,
  sessionId: number,
  model: string,
  createChat: ChatFactory,
): Promise<DistillResult> {
  const session = getSession(db, sessionId);
  if (!session) return skip("Session not found");
  if (!(ELIGIBLE_PURPOSES as readonly string[]).includes(session.purpose)) {
    return skip(`Ineligible purpose: ${session.purpose}`);
  }
  if (session.distilledAt !== null) return skip("Already distilled");

  const history = getHistory(db, sessionId);
  const substantive = history.filter(
    (m) => (m.role === "user" || m.role === "assistant") && !m.isCompaction,
  );
  if (substantive.length < MIN_SUBSTANTIVE_MESSAGES) {
    markDistilled(db, sessionId);
    return skip("Too few substantive messages");
  }

  const formatted = formatConversation(history);
  if (formatted.length < MIN_CONVERSATION_LENGTH) {
    markDistilled(db, sessionId);
    return skip("Conversation too short");
  }

  const systemSession = createSession(db, `system:distill:${sessionId}`, { purpose: "system" });
  const systemSessionId = systemSession.id as number;

  try {
    const tools = [
      createRecallTool(db),
      createRememberTool(db),
      createReviseTool(db),
      createForgetTool(db),
    ];

    const result = await executeTurn(
      {
        sessionId: systemSessionId,
        content: formatted,
        systemPrompt: DISTILL_SYSTEM_PROMPT,
        model,
        maxIterations: MAX_DISTILL_ITERATIONS,
      },
      { db, tools, createChat },
    );

    if (result.cost.estimatedUsd > 0 || result.usage.totalTokens > 0) {
      accumulateUsage(db, sessionId, {
        tokensIn: result.usage.inputTokens,
        tokensOut: result.usage.outputTokens,
        reasoningTokens: result.usage.reasoningTokens,
        cachedTokens: result.usage.cachedTokens,
        costUsd: result.cost.estimatedUsd,
      });
    }

    const toolCalls = countToolCalls(db, systemSessionId);

    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("UPDATE messages SET distilled = 1 WHERE session_id = ? AND distilled = 0").run(
        sessionId,
      );
      markDistilled(db, sessionId);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }

    return { skipped: false, toolCalls };
  } finally {
    closeSession(db, systemSessionId);
  }
}
