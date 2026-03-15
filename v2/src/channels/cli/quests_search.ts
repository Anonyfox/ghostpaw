import { defineCommand } from "citty";
import { listQuests } from "../../core/quests/api/read/index.ts";
import type { QuestStatus } from "../../core/quests/api/types.ts";
import { style } from "../../lib/terminal/index.ts";
import { errorLine, questRow, questTableHeader } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "search", description: "Search quests by keyword" },
  args: {
    query: {
      type: "positional",
      description: "Search keywords",
      required: true,
    },
    status: {
      type: "string",
      description: "Filter: pending, active, blocked, done, failed, cancelled",
    },
    limit: {
      type: "string",
      description: "Maximum results (default: 20)",
    },
  },
  async run({ args }) {
    const query = (args._ ?? []).join(" ") || (args.query as string);
    if (!query?.trim()) {
      errorLine("Search query is required.");
      return;
    }

    await withRunDb((db) => {
      const limit = args.limit ? Number.parseInt(args.limit as string, 10) : 20;

      const quests = listQuests(db, {
        query: query.trim(),
        status: args.status as QuestStatus | undefined,
        limit,
      });

      if (quests.length === 0) {
        console.log(style.dim(`No quests match "${query.trim()}".`));
        return;
      }

      console.log(
        style.dim(
          `${quests.length} result${quests.length !== 1 ? "s" : ""} for "${query.trim()}":`,
        ),
      );
      console.log(questTableHeader());
      for (const q of quests) {
        console.log(questRow(q));
      }
    });
  },
});
