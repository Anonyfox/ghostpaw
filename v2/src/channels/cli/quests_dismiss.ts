import { defineCommand } from "citty";
import { dismissQuest } from "../../core/quests/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { errorLine } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "dismiss", description: "Dismiss an offered quest from the board" },
  args: {
    id: {
      type: "positional",
      description: "Quest ID to dismiss",
      required: true,
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
        const q = dismissQuest(db, id);
        console.log(
          style.dim("dismissed".padStart(10)),
          ` #${q.id} "${q.title}"`,
        );
      });
    } catch (err) {
      errorLine(err instanceof Error ? err.message : String(err));
    }
  },
});
