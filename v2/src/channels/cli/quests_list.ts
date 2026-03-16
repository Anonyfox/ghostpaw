import { defineCommand } from "citty";
import { listQuests } from "../../core/quests/api/read/index.ts";
import type { QuestPriority, QuestStatus } from "../../core/quests/api/types.ts";
import { DEFAULT_EXCLUDE_STATUSES } from "../../core/quests/api/types.ts";
import { style } from "../../lib/terminal/index.ts";
import { questRow, questTableHeader } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "list", description: "Browse quests with filters" },
  args: {
    status: {
      type: "string",
      description: "Filter: offered, accepted, active, blocked, done, failed, abandoned",
    },
    priority: {
      type: "string",
      description: "Filter: low, normal, high, urgent",
    },
    log: {
      type: "string",
      description: "Filter by storyline ID",
    },
    query: {
      type: "string",
      description: "Full-text search across titles and descriptions",
    },
    limit: {
      type: "string",
      description: "Maximum results (default: 50)",
    },
    all: {
      type: "boolean",
      description: "Show all quests including done and offered",
    },
  },
  async run({ args }) {
    await withRunDb((db) => {
      const limit = args.limit ? Number.parseInt(args.limit as string, 10) : 50;
      const storylineId = args.log ? Number.parseInt(args.log as string, 10) : undefined;
      const hasStatusFilter = !!(args.status as string);
      const showAll = args.all as boolean;

      const quests = listQuests(db, {
        status: args.status as QuestStatus | undefined,
        priority: args.priority as QuestPriority | undefined,
        storylineId,
        query: args.query as string | undefined,
        excludeStatuses: hasStatusFilter || showAll ? undefined : [...DEFAULT_EXCLUDE_STATUSES],
        limit,
      });

      if (quests.length === 0) {
        console.log(style.dim("No quests match the filter."));
        return;
      }

      console.log(style.dim(`${quests.length} quest${quests.length !== 1 ? "s" : ""}`));
      console.log(questTableHeader());
      for (const q of quests) {
        console.log(questRow(q));
      }
    });
  },
});
