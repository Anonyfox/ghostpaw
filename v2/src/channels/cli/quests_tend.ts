import { defineCommand } from "citty";
import { runTend } from "../../harness/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "tend", description: "Quest board maintenance — clean stale entries" },
  async run() {
    await withRunDb((db) => {
      runTend(db);
    });
  },
});
