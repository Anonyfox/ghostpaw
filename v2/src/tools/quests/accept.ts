import { createTool, Schema } from "chatoyant";
import { acceptQuest } from "../../core/quests/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatQuest } from "./format_quest.ts";

class QuestAcceptParams extends Schema {
  id = Schema.Integer({
    description: "Quest ID to accept from the Quest Board.",
  });
  questLogId = Schema.Integer({
    optional: true,
    description: "Assign to a quest log (storyline) on acceptance.",
  });
}

export function createQuestAcceptTool(db: DatabaseHandle) {
  return createTool({
    name: "quest_accept",
    description:
      "Accept an offered quest from the Quest Board, transitioning it to 'pending'. " +
      "Only works on quests with status 'offered'. Optionally assign to a quest log.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new QuestAcceptParams() as any,
    execute: async ({ args }) => {
      const { id, questLogId } = args as { id: number; questLogId?: number };

      if (!Number.isInteger(id) || id <= 0) {
        return { error: "Valid quest ID is required." };
      }

      try {
        const quest = acceptQuest(db, id, { questLogId });
        return { quest: formatQuest(quest) };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
