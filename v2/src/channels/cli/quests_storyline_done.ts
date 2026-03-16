import { defineCommand } from "citty";
import { updateStoryline } from "../../core/quests/api/write/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { errorLine } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "storyline-done", description: "Mark a storyline as completed" },
  args: {
    id: {
      type: "positional",
      description: "Storyline ID",
      required: true,
    },
  },
  async run({ args }) {
    const raw = (args._ ?? [])[0] || (args.id as string);
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      errorLine("Storyline ID must be a positive integer.");
      return;
    }

    try {
      await withRunDb((db) => {
        const log = updateStoryline(db, id, { status: "completed" });
        console.log(style.green("completed".padStart(10)), ` #${log.id} "${log.title}"`);
      });
    } catch (err) {
      errorLine(err instanceof Error ? err.message : String(err));
    }
  },
});
