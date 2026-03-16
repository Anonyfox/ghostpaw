import { createTool, Schema } from "chatoyant";
import { getQuest, getStreakInfo } from "../../core/quests/api/read/index.ts";
import { completeQuest } from "../../core/quests/api/write/index.ts";
import { dropSkillFragment } from "../../core/skills/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatQuest } from "./format_quest.ts";

class QuestDoneParams extends Schema {
  id = Schema.Integer({
    description: "Quest ID to mark as done.",
  });
  occurrenceAt = Schema.Integer({
    optional: true,
    description:
      "For recurring quests: timestamp of the specific occurrence to mark done. " +
      "Omit to mark the entire series done.",
  });
}

export function createQuestDoneTool(db: DatabaseHandle) {
  return createTool({
    name: "quest_done",
    description:
      "Mark a quest as completed. For recurring quests, pass occurrenceAt to record " +
      "a single occurrence without closing the series. Omit occurrenceAt to mark " +
      "the entire quest done.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new QuestDoneParams() as any,
    execute: async ({ args }) => {
      const { id, occurrenceAt } = args as { id: number; occurrenceAt?: number };

      if (!Number.isInteger(id) || id <= 0) {
        return { error: "Valid quest ID is required." };
      }

      const existing = getQuest(db, id);
      if (!existing) return { error: `Quest #${id} not found.` };

      if (["done", "failed", "abandoned"].includes(existing.status)) {
        return { error: `Quest #${id} is already "${existing.status}".` };
      }

      if (existing.status === "offered") {
        return { error: `Quest #${id} is "offered" — accept it first before completing.` };
      }

      try {
        const result = completeQuest(db, id, occurrenceAt || undefined);

        if ("questId" in result) {
          const quest = getQuest(db, id)!;
          const streak = getStreakInfo(db, id);
          return {
            quest: formatQuest(quest, streak),
            occurrence: result,
            note: "Occurrence recorded. Recurring quest remains active.",
          };
        }

        try {
          dropSkillFragment(
            db,
            "quest",
            String(id),
            `Quest completed: "${result.title}". ${result.description ?? ""}`.trim(),
          );
        } catch {
          // best-effort, don't block completion
        }

        return { quest: formatQuest(result) };
      } catch (err) {
        return {
          error: `Failed to complete quest: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  });
}
