import { defineCommand } from "citty";
import type { QuestCreator, QuestPriority } from "../../core/quests/api/types.ts";
import { createQuest } from "../../core/quests/api/write/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { errorLine } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "offer", description: "Quick-add a quest to the Quest Board" },
  args: {
    title: {
      type: "positional",
      description: "Quest title",
      required: true,
    },
    desc: {
      type: "string",
      description: "Description (markdown)",
    },
    priority: {
      type: "string",
      description: "Priority: low, normal, high, urgent (default: normal)",
    },
    by: {
      type: "string",
      description: "Creator: human (default) or ghost",
    },
  },
  async run({ args }) {
    const title = (args._ ?? []).join(" ") || (args.title as string);
    if (!title?.trim()) {
      errorLine("Quest title is required.");
      return;
    }

    try {
      await withRunDb((db) => {
        const q = createQuest(db, {
          title: title.trim(),
          status: "offered",
          description: args.desc as string | undefined,
          priority: (args.priority as QuestPriority) ?? undefined,
          createdBy: (args.by as QuestCreator) ?? undefined,
        });

        const icon = q.createdBy === "ghostpaw" ? "!" : "?";
        console.log(style.yellow("offered".padStart(10)), ` #${q.id} ${icon} "${q.title}"`);
      });
    } catch (err) {
      errorLine(err instanceof Error ? err.message : String(err));
    }
  },
});
