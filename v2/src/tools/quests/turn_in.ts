import { createTool, Schema } from "chatoyant";
import { getQuest } from "../../core/quests/api/read/index.ts";
import { executeTurnIn } from "../../harness/quest/turn_in.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatQuest } from "./format_quest.ts";

class QuestTurnInParams extends Schema {
  id = Schema.Integer({
    description: "Quest ID to turn in. Must be in 'done' status.",
  });
}

export function createQuestTurnInTool(db: DatabaseHandle) {
  return createTool({
    name: "quest_turnin",
    description:
      "Turn in a completed quest to reveal rewards. Reveals sealed soul shards from " +
      "execution, drops a skill fragment, and transitions to turned_in. " +
      "Call after quest_done to collect rewards.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new QuestTurnInParams() as any,
    execute: async ({ args }) => {
      const { id } = args as { id: number };

      if (!Number.isInteger(id) || id <= 0) {
        return { error: "Valid quest ID is required." };
      }

      const existing = getQuest(db, id);
      if (!existing) return { error: `Quest #${id} not found.` };

      if (existing.status !== "done") {
        return {
          error: `Quest #${id} is "${existing.status}" — only "done" quests can be turned in.`,
        };
      }

      try {
        const summary = executeTurnIn(db, id);
        return {
          quest: formatQuest(summary.quest, { xp: summary.xpEarned }),
          revealedShards: summary.revealedShards,
          fragmentDropped: summary.fragmentDropped,
          xpEarned: summary.xpEarned,
          narrative: summary.narrative,
        };
      } catch (err) {
        return {
          error: `Failed to turn in quest: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  });
}
