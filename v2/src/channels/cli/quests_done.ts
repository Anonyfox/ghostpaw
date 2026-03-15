import { defineCommand } from "citty";
import type { Quest, QuestOccurrence } from "../../core/quests/api/types.ts";
import { completeQuest } from "../../core/quests/api/write/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { errorLine, formatDate, parseTimestamp } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "done", description: "Mark a quest as completed" },
  args: {
    id: {
      type: "positional",
      description: "Quest ID",
      required: true,
    },
    at: {
      type: "string",
      description: "Occurrence timestamp for recurring quests (ISO 8601 or unix ms)",
    },
  },
  async run({ args }) {
    const raw = (args._ ?? [])[0] || (args.id as string);
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      errorLine("Quest ID must be a positive integer.");
      return;
    }

    try {
      await withRunDb((db) => {
        const occurrenceAt = args.at ? parseTimestamp(args.at as string) : undefined;

        const result = completeQuest(db, id, occurrenceAt);

        if ("questId" in result) {
          const occ = result as QuestOccurrence;
          console.log(
            style.green("occurrence".padStart(10)),
            ` #${occ.questId} @ ${formatDate(occ.occurrenceAt)} recorded`,
          );
        } else {
          const q = result as Quest;
          console.log(style.green("done".padStart(10)), ` #${q.id} "${q.title}"`);
        }
      });
    } catch (err) {
      errorLine(err instanceof Error ? err.message : String(err));
    }
  },
});
