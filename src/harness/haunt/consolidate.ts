import { getHistory, parseToolCallData } from "../../core/chat/api/read/index.ts";
import {
  type ChatFactory,
  closeSession,
  createSession,
  executeTurn,
} from "../../core/chat/api/write/index.ts";
import type { Memory } from "../../core/memory/api/types.ts";
import { MANDATORY_SOUL_IDS } from "../../core/souls/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { createDropSoulshardTool } from "../../tools/souls/drop_soulshard.ts";
import { createDropFragmentTool } from "../../tools/trainer/drop_fragment.ts";
import { assembleContext } from "../context.ts";
import { formatPackPatrol } from "../format_pack_patrol.ts";
import { createWardenTools } from "../tools.ts";
import type { ConsolidationResult } from "./types.ts";

const MAX_CONSOLIDATION_ITERATIONS = 15;

const CONSOLIDATION_INSTRUCTION = `Here is a completed private thinking session. Extract what is worth preserving.

First, write a summary (2-5 sentences). What was explored, what was discovered, what shifted.

Then, use your persistence tools:
- **Memory**: For each potential belief, formulate a clear claim, recall to check for duplicates, then remember (new), revise (correct/confirm existing), or skip. Only genuine discoveries grounded in the session content. Never fabricate claims the session does not support — skip rather than guess. Hypotheses get confidence 0.4-0.5 with source "inferred". Observed facts get 0.7-0.8 with source "observed".
- **Pack**: If the session mentions interactions with people, update their pack bonds or notes.
- **Quests**: If the session surfaced tasks or commitments, create or update quests accordingly.

Maximum ~5 memories per session. Do nothing if the session was routine.

- **Skill fragments**: If the session reveals a pattern, workaround, or recurring correction that could improve a skill, use drop_fragment to stash a brief observation. Only genuine skill-relevant signals — skip if nothing applies.

- **Soulshards**: If the session reveals a cognitive pattern about a soul's judgment or approach (not procedural — that's a skill fragment), use drop_soulshard naming the relevant soul(s). Skip if nothing applies.

If this session surfaced a genuine question for the user — real curiosity worth exploring together — write it after "HIGHLIGHT:" on its own line, playfully, as their companion. Skip this unless it would make them want to reply.`;

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
  const counts: Record<string, number> = {};
  const messages = getHistory(db, sessionId);

  for (const msg of messages) {
    if (msg.role !== "tool_call" || !msg.toolData) continue;
    for (const call of parseToolCallData(msg.toolData)) {
      counts[call.name] = (counts[call.name] ?? 0) + 1;
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
    soulId: MANDATORY_SOUL_IDS.warden,
  });
  const systemSessionId = systemSession.id as number;

  try {
    const tools = [
      ...createWardenTools(db),
      createDropFragmentTool(db, { source: "session", sourceId: String(hauntSessionId) }),
      createDropSoulshardTool(db, { source: "haunt", sourceId: String(hauntSessionId) }),
    ];

    const patrol = formatPackPatrol(db);
    const content = [
      CONSOLIDATION_INSTRUCTION,
      patrol,
      `Journal from private session:\n\n${rawJournal}${formatSeededMemoriesForConsolidation(seededMemories)}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const systemPrompt = assembleContext(db, "", {
      soulId: MANDATORY_SOUL_IDS.warden,
    });

    const result = await executeTurn(
      {
        sessionId: systemSessionId,
        content,
        systemPrompt,
        model,
        maxIterations: MAX_CONSOLIDATION_ITERATIONS,
      },
      { db, tools, createChat },
    );

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
