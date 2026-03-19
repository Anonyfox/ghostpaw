import { resolve } from "node:path";
import { defineCommand } from "citty";
import { runProwl } from "../../harness/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "prowl", description: "Check for and spawn eligible quest embarks" },
  async run() {
    await withRunDb((db) => {
      const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
      runProwl(db, workspace);
    });
  },
});
