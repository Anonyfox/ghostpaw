import {
  type ChatFactory,
  closeSession,
  createSession,
  executeTurn,
} from "../../core/chat/api/write/index.ts";
import { getQuest } from "../../core/quests/api/read/index.ts";
import { MANDATORY_SOUL_IDS } from "../../core/souls/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { assembleContext } from "../context.ts";
import { createWardenTools } from "../tools.ts";

export async function planSubgoals(
  db: DatabaseHandle,
  questId: number,
  model: string,
  createChat: ChatFactory,
): Promise<void> {
  const quest = getQuest(db, questId)!;
  const session = createSession(db, `system:embark-plan:${questId}:${Date.now()}`, {
    purpose: "system",
    soulId: MANDATORY_SOUL_IDS.warden,
  });
  const sid = session.id as number;

  try {
    const tools = createWardenTools(db);
    const systemPrompt = assembleContext(db, "", { soulId: MANDATORY_SOUL_IDS.warden });

    const content = [
      `Plan subgoals for quest #${questId}: "${quest.title}".`,
      quest.description ? `\nDescription: ${quest.description}` : "",
      `Priority: ${quest.priority}`,
      "",
      "Break this quest into 3-8 concrete, actionable subgoals using quest_subgoals(action='add').",
      "Order them logically. Each subgoal should be independently verifiable.",
      "Do NOT mark any subgoal as done yet — just plan them.",
    ].join("\n");

    await executeTurn(
      { sessionId: sid, content, systemPrompt, model, maxIterations: 10 },
      { db, tools, createChat },
    );
  } finally {
    closeSession(db, sid);
  }
}
