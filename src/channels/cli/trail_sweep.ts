import { resolve } from "node:path";
import { defineCommand } from "citty";
import { createEntity } from "../../harness/index.ts";
import { runTrailSweepWithHistorian } from "../../harness/run_trail_sweep.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "sweep", description: "Run the trail sweep — historian nightly synthesis" },
  args: {
    model: {
      type: "string",
      alias: "m",
      description: "Model override",
    },
  },
  async run({ args }) {
    await withRunDb(async (db) => {
      const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
      const entity = createEntity({ db, workspace });
      const model = args.model as string | undefined;

      console.log(style.dim("running trail sweep..."));

      const result = await runTrailSweepWithHistorian(entity, db, { model });

      if (!result.succeeded) {
        console.error(style.boldRed("error".padStart(10)), " historian sweep failed");
        process.exitCode = 1;
        return;
      }

      console.log(style.cyan("trail sweep"), "complete");
    });
  },
});
