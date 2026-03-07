import { defineCommand } from "citty";
import { pruneEmptySessions } from "../../core/chat/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "prune", description: "Delete empty sessions older than 1 hour" },
  args: {},
  async run() {
    await withRunDb((db) => {
      const pruned = pruneEmptySessions(db);
      if (pruned === 0) {
        console.log(style.dim("No empty sessions to prune."));
      } else {
        console.log(style.cyan("pruned".padStart(10)), ` ${pruned} empty sessions`);
      }
    });
  },
});
