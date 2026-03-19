import { defineCommand } from "citty";
import { countMembers } from "../../core/pack/api/read/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "count", description: "Show pack member status breakdown" },
  async run() {
    await withRunDb((db) => {
      const counts = countMembers(db);
      console.log(
        `${style.cyan(String(counts.active))} active / ${style.dim(String(counts.dormant))} dormant / ${style.dim(String(counts.lost))} lost / ${style.bold(String(counts.total))} total`,
      );
    });
  },
});
