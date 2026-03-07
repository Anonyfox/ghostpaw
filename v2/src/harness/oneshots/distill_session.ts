import type { ChatFactory } from "../../core/chat/chat_instance.ts";
import {
  accumulateUsage,
  closeSession,
  createSession,
  executeTurn,
  getHistory,
  getSession,
  markDistilled,
  markMessagesDistilled,
} from "../../core/chat/index.ts";
import { formatConversation } from "../../core/memory/format_conversation.ts";
import { MANDATORY_SOUL_IDS } from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { assembleContext } from "../context.ts";
import type { DistillResult, DistillToolCalls } from "../distill_types.ts";
import {
  ELIGIBLE_PURPOSES,
  MAX_DISTILL_ITERATIONS,
  MIN_CONVERSATION_LENGTH,
  MIN_SUBSTANTIVE_MESSAGES,
} from "../distill_types.ts";
import { createWardenTools } from "../tools.ts";

const DISTILL_INSTRUCTION = `Here is a completed conversation. Extract what is worth preserving long-term.

Use your persistence tools:
- **Memory**: For each potential belief, formulate a clear claim, recall to check for duplicates, then act: remember (new), revise with ID (correct/confirm existing), or forget (now wrong). Categories: preference, fact, procedure, capability, custom. Sources: explicit, observed, inferred.
- **Pack**: If the conversation mentions interactions with people, update their pack bonds or notes.
- **Quests**: If tasks or commitments were mentioned, create or update quests accordingly.

Quality: each claim must be self-contained and useful without the original conversation. Include specifics: names, commands, paths, versions. Corrections and updates are highest priority. Skip greetings, status checks, obvious facts, tool noise. Do nothing if routine. Maximum ~5 beliefs per conversation.`;

function skip(reason: string): DistillResult {
  return { skipped: true, reason, toolCalls: {} };
}

function countToolCalls(db: DatabaseHandle, systemSessionId: number): DistillToolCalls {
  const counts: DistillToolCalls = {};
  const messages = getHistory(db, systemSessionId);

  for (const msg of messages) {
    if (msg.role !== "tool_call" || !msg.toolData) continue;
    try {
      const data = JSON.parse(msg.toolData) as { name?: string };
      if (data.name) {
        counts[data.name] = (counts[data.name] ?? 0) + 1;
      }
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

  const systemSession = createSession(db, `system:distill:${sessionId}`, {
    purpose: "system",
    soulId: MANDATORY_SOUL_IDS.warden,
  });
  const systemSessionId = systemSession.id as number;

  try {
    const tools = createWardenTools(db);

    const systemPrompt = assembleContext(db, "", "", {
      soulId: MANDATORY_SOUL_IDS.warden,
    });

    const content = `${DISTILL_INSTRUCTION}\n\n${formatted}`;

    const result = await executeTurn(
      {
        sessionId: systemSessionId,
        content,
        systemPrompt,
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
      markMessagesDistilled(db, sessionId);
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
