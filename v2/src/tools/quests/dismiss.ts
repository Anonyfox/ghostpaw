import { createTool, Schema } from "chatoyant";
import { dismissQuest } from "../../core/quests/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatQuest } from "./format_quest.ts";

class QuestDismissParams extends Schema {
  id = Schema.Integer({
    description: "Quest ID to dismiss from the Quest Board.",
  });
}

export function createQuestDismissTool(db: DatabaseHandle) {
  return createTool({
    name: "quest_dismiss",
    description:
      "Dismiss an offered quest from the Quest Board, transitioning it to 'cancelled'. " +
      "Only works on quests with status 'offered'.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new QuestDismissParams() as any,
    execute: async ({ args }) => {
      const { id } = args as { id: number };

      if (!Number.isInteger(id) || id <= 0) {
        return { error: "Valid quest ID is required." };
      }

      try {
        const quest = dismissQuest(db, id);
        return { quest: formatQuest(quest) };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
