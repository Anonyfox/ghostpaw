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

export async function consolidateEmbark(
  db: DatabaseHandle,
  questId: number,
  model: string,
  createChat: ChatFactory,
): Promise<void> {
  const quest = getQuest(db, questId)!;
  const session = createSession(db, `system:embark-consolidate:${questId}:${Date.now()}`, {
    purpose: "system",
    soulId: MANDATORY_SOUL_IDS.warden,
  });
  const sid = session.id as number;

  try {
    const tools = createWardenTools(db);
    const systemPrompt = assembleContext(db, "", { soulId: MANDATORY_SOUL_IDS.warden });

    const content = [
      `Quest #${questId} "${quest.title}" has been completed.`,
      "",
      "Extract what is worth preserving:",
      "- Remember key insights or decisions made during execution.",
      "- Update pack bonds if people were involved.",
      "- Note any patterns that could improve future quest execution.",
      "",
      "Be brief. Only persist genuinely useful information.",
    ].join("\n");

    await executeTurn(
      { sessionId: sid, content, systemPrompt, model, maxIterations: 10 },
      { db, tools, createChat },
    );
  } finally {
    closeSession(db, sid);
  }
}
