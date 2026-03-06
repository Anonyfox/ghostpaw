import { defineCommand } from "citty";
import { updateQuestLog } from "../../core/quests/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { errorLine } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "log-done", description: "Mark a quest log as completed" },
  args: {
    id: {
      type: "positional",
      description: "Quest log ID",
      required: true,
    },
  },
  async run({ args }) {
    const raw = (args._ ?? [])[0] || (args.id as string);
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      errorLine("Quest log ID must be a positive integer.");
      return;
    }

    try {
      await withRunDb((db) => {
        const log = updateQuestLog(db, id, { status: "completed" });
        console.log(
          style.green("completed".padStart(10)),
          ` #${log.id} "${log.title}"`,
        );
      });
    } catch (err) {
      errorLine(err instanceof Error ? err.message : String(err));
    }
  },
});
