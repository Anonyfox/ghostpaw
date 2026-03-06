import { createTool, Schema } from "chatoyant";
import {
  getQuestLogProgress,
  listQuestLogs,
  QUEST_LOG_STATUSES,
} from "../../core/quests/index.ts";
import type { QuestLogStatus } from "../../core/quests/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatQuestLog } from "./format_quest.ts";

class QuestLogListParams extends Schema {
  status = Schema.Enum([...QUEST_LOG_STATUSES] as unknown as readonly string[], {
    optional: true,
    description: "Filter by status: active, completed, archived. Default: shows all.",
  });
}

export function createQuestLogListTool(db: DatabaseHandle) {
  return createTool({
    name: "questlog_list",
    description:
      "List quest logs (storylines) with progress counts. Each log shows how many " +
      "quests are done, active, pending, blocked, and offered.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new QuestLogListParams() as any,
    execute: async ({ args }) => {
      const { status } = args as { status?: QuestLogStatus };

      const logs = listQuestLogs(db, { status });

      if (logs.length === 0) {
        return {
          logs: [],
          note: "No quest logs yet. Use questlog_create to start a storyline.",
        };
      }

      return {
        logs: logs.map((log) => {
          const progress = getQuestLogProgress(db, log.id);
          return formatQuestLog(log, progress);
        }),
      };
    },
  });
}
