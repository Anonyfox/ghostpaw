import { createTool, Schema } from "chatoyant";
import { acceptQuest } from "../../core/quests/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatQuest } from "./format_quest.ts";

class QuestAcceptParams extends Schema {
  id = Schema.Integer({
    description: "Quest ID to accept from the Quest Board.",
  });
  storylineId = Schema.Integer({
    optional: true,
    description: "Assign to a storyline on acceptance.",
  });
}

export function createQuestAcceptTool(db: DatabaseHandle) {
  return createTool({
    name: "quest_accept",
    description:
      "Accept an offered quest from the Quest Board, transitioning it to 'accepted'. " +
      "Only works on quests with status 'offered'. Optionally assign to a storyline.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new QuestAcceptParams() as any,
    execute: async ({ args }) => {
      const { id, storylineId } = args as { id: number; storylineId?: number };

      if (!Number.isInteger(id) || id <= 0) {
        return { error: "Valid quest ID is required." };
      }

      try {
        const quest = acceptQuest(db, id, { storylineId });
        return { quest: formatQuest(quest) };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
