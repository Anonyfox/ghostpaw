import type { ChatFactory } from "../../core/chat/chat_instance.ts";
import {
  accumulateUsage,
  closeSession,
  createSession,
  executeTurn,
  getHistory,
} from "../../core/chat/index.ts";
import type { Memory } from "../../core/memory/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import {
  createForgetTool,
  createRecallTool,
  createRememberTool,
  createReviseTool,
} from "../../tools/memory/index.ts";
import type { ConsolidationResult } from "./types.ts";

const MAX_CONSOLIDATION_ITERATIONS = 15;

const CONSOLIDATION_PROMPT = `You are reviewing a completed private thinking session. The session is over. Your job: extract what's worth keeping and clean up.

First, write a summary (2-5 sentences). What was explored, what was discovered, what shifted. Write for a future version of yourself that will read this instead of the full journal.

Then, update beliefs using the tools. For each potential belief:
1. Formulate a clear, self-contained claim
2. Call recall to check if similar beliefs already exist
3. Act: remember (new), revise with ID (correct/confirm), or skip

Quality: only genuine discoveries, corrections, or insights — not echoes of what's already known. Hypotheses get confidence 0.4-0.5 with source "inferred". Observed facts get 0.7-0.8 with source "observed".

Finally, if this session surfaced a genuine question you cannot resolve alone, or real curiosity about something fundamental you want to explore WITH the user — write it after "HIGHLIGHT:" on its own line, playfully, as their companion. Never a summary or report. Skip this unless it would make them want to reply.

Maximum ~5 memories per session. Do nothing if the session was routine.`;

function formatSeededMemoriesForConsolidation(memories: Memory[]): string {
  if (memories.length === 0) return "";
  const lines = memories.map(
    (m) =>
      `- #${m.id}: ${m.claim} [${m.category}, confidence=${Math.round(m.confidence * 100) / 100}]`,
  );
  return `\n\nCurrent beliefs (already stored — use revise with ID to correct or confirm):\n${lines.join("\n")}`;
}

function extractSummaryFromResponse(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "(empty consolidation)";
  if (trimmed.length <= 500) return trimmed;
  return `${trimmed.slice(0, 500)}...`;
}

function extractHighlight(text: string): string | null {
  const marker = "HIGHLIGHT:";
  const idx = text.indexOf(marker);
  if (idx === -1) return null;
  const after = text.slice(idx + marker.length).trim();
  if (after.length === 0 || after.toLowerCase() === "none") return null;
  return after;
}

function countToolCalls(db: DatabaseHandle, sessionId: number): ConsolidationResult["toolCalls"] {
  const counts = { recall: 0, remember: 0, revise: 0, forget: 0 };
  const messages = getHistory(db, sessionId);

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
      // malformed tool_data
    }
  }
  return counts;
}

export async function consolidateHaunt(
  db: DatabaseHandle,
  hauntSessionId: number,
  rawJournal: string,
  seededMemories: Memory[],
  model: string,
  createChat: ChatFactory,
): Promise<ConsolidationResult> {
  const systemSession = createSession(db, `system:consolidate:${hauntSessionId}`, {
    purpose: "system",
  });
  const systemSessionId = systemSession.id as number;

  try {
    const tools = [
      createRecallTool(db),
      createRememberTool(db),
      createReviseTool(db),
      createForgetTool(db),
    ];

    const content =
      `Journal from private session:\n\n${rawJournal}` +
      formatSeededMemoriesForConsolidation(seededMemories);

    const result = await executeTurn(
      {
        sessionId: systemSessionId,
        content,
        systemPrompt: CONSOLIDATION_PROMPT,
        model,
        maxIterations: MAX_CONSOLIDATION_ITERATIONS,
      },
      { db, tools, createChat },
    );

    if (result.cost.estimatedUsd > 0 || result.usage.totalTokens > 0) {
      accumulateUsage(db, hauntSessionId, {
        tokensIn: result.usage.inputTokens,
        tokensOut: result.usage.outputTokens,
        reasoningTokens: result.usage.reasoningTokens,
        cachedTokens: result.usage.cachedTokens,
        costUsd: result.cost.estimatedUsd,
      });
    }

    const toolCalls = countToolCalls(db, systemSessionId);
    const summary = extractSummaryFromResponse(result.content);
    const highlight = extractHighlight(result.content);

    return {
      summary,
      toolCalls,
      highlight,
      cost: result.cost,
    };
  } finally {
    closeSession(db, systemSessionId);
  }
}
