import { defineCommand } from "citty";
import type { QuestCreator } from "../../core/quests/index.ts";
import { createQuestLog } from "../../core/quests/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { errorLine, parseTimestamp } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "log-add", description: "Create a new quest log" },
  args: {
    title: {
      type: "positional",
      description: "Quest log title",
      required: true,
    },
    desc: {
      type: "string",
      description: "Description",
    },
    due: {
      type: "string",
      description: "Deadline (ISO 8601 or unix ms)",
    },
    by: {
      type: "string",
      description: "Creator: human (default) or ghost",
    },
  },
  async run({ args }) {
    const title = (args._ ?? []).join(" ") || (args.title as string);
    if (!title?.trim()) {
      errorLine("Quest log title is required.");
      return;
    }

    try {
      await withRunDb((db) => {
        const log = createQuestLog(db, {
          title: title.trim(),
          description: args.desc as string | undefined,
          dueAt: args.due ? parseTimestamp(args.due as string) : undefined,
          createdBy: (args.by as QuestCreator) ?? undefined,
        });

        console.log(style.cyan("stored".padStart(10)), ` #${log.id} "${log.title}"`);
      });
    } catch (err) {
      errorLine(err instanceof Error ? err.message : String(err));
    }
  },
});
