import { defineCommand } from "citty";
import { acceptQuest } from "../../core/quests/api/write/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { errorLine } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "accept", description: "Accept an offered quest from the board" },
  args: {
    id: {
      type: "positional",
      description: "Quest ID to accept",
      required: true,
    },
    log: {
      type: "string",
      description: "Assign to quest log by ID",
    },
  },
  async run({ args }) {
    const id = Number.parseInt(args.id as string, 10);
    if (!Number.isFinite(id)) {
      errorLine("Valid quest ID is required.");
      return;
    }

    try {
      await withRunDb((db) => {
        const questLogId = args.log ? Number.parseInt(args.log as string, 10) : undefined;
        const q = acceptQuest(db, id, { questLogId });
        console.log(style.cyan("accepted".padStart(10)), ` #${q.id} "${q.title}"`);
        if (q.questLogId) {
          console.log(style.dim(`${"".padStart(10)}  assigned to log #${q.questLogId}`));
        }
      });
    } catch (err) {
      errorLine(err instanceof Error ? err.message : String(err));
    }
  },
});
