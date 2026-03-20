import {
  type ChatFactory,
  closeSession,
  createSession,
  executeTurn,
} from "../../core/chat/api/write/index.ts";
import type { Quest, Subgoal } from "../../core/quests/api/types.ts";
import { MANDATORY_SOUL_IDS } from "../../core/souls/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { assembleContext } from "../context.ts";
import { createWardenTools } from "../tools.ts";

const MAX_VALIDATION_ITERATIONS = 10;

export async function validateStep(
  db: DatabaseHandle,
  quest: Quest,
  subgoals: Subgoal[],
  coordinatorOutput: string,
  model: string,
  createChat: ChatFactory,
): Promise<string> {
  const session = createSession(db, `system:embark-validate:${quest.id}:${Date.now()}`, {
    purpose: "system",
    soulId: MANDATORY_SOUL_IDS.warden,
  });
  const sessionId = session.id as number;

  try {
    const tools = createWardenTools(db);
    const systemPrompt = assembleContext(db, "", {
      soulId: MANDATORY_SOUL_IDS.warden,
    });

    const done = subgoals.filter((s) => s.done).length;
    const subgoalList = subgoals
      .map((s) => `${s.done ? "[x]" : "[ ]"} #${s.id}: ${s.text}`)
      .join("\n");

    const content = [
      `You are validating progress on quest #${quest.id}: "${quest.title}".`,
      quest.description ? `\nDescription: ${quest.description}` : "",
      `\nSubgoals (${done}/${subgoals.length} done):\n${subgoalList || "(none yet)"}`,
      `\n## Coordinator's Work Output\n\n${coordinatorOutput}`,
      "\n## Your Task",
      "",
      "Evaluate the coordinator's work against the quest objectives:",
      "- Use quest_subgoals to mark completed subgoals as done, add new ones, or remove irrelevant ones.",
      "- If ALL objectives are met, call quest_done to complete the quest.",
      "- If progress was made but more work needed, describe what should happen next.",
      "- NEVER set a quest to blocked or failed. Only the user or the embark loop can block a quest.",
      "  Incomplete subgoals are normal — the embark runs multiple turns. Just give feedback.",
    ].join("\n");

    const result = await executeTurn(
      { sessionId, content, systemPrompt, model, maxIterations: MAX_VALIDATION_ITERATIONS },
      { db, tools, createChat },
    );

    return result.content;
  } finally {
    closeSession(db, sessionId);
  }
}
