import { createTool, Schema } from "chatoyant";
import { createQuestLog } from "../../core/quests/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatQuestLog } from "./format_quest.ts";

class QuestLogCreateParams extends Schema {
  title = Schema.String({
    description: "Quest log (storyline) title.",
  });
  description = Schema.String({
    optional: true,
    description: "Description of what this storyline tracks.",
  });
  dueAt = Schema.Integer({
    optional: true,
    description: "Optional deadline for the entire storyline (Unix ms).",
  });
}

export function createQuestLogCreateTool(db: DatabaseHandle) {
  return createTool({
    name: "questlog_create",
    description:
      "Create a quest log (storyline) to group related quests. " +
      "Like an RPG quest chain or a project tracker.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new QuestLogCreateParams() as any,
    execute: async ({ args }) => {
      const { title, description, dueAt } = args as {
        title: string;
        description?: string;
        dueAt?: number;
      };

      if (!title?.trim()) {
        return { error: "Title must not be empty." };
      }

      try {
        const log = createQuestLog(db, {
          title: title.trim(),
          description,
          dueAt,
        });
        return { questLog: formatQuestLog(log) };
      } catch (err) {
        return { error: `Failed to create quest log: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  });
}
