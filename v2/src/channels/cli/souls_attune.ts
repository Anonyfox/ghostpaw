import { resolve } from "node:path";
import { defineCommand } from "citty";
import { createEntity, runAttune } from "../../harness/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "attune", description: "Run the soul attunement cycle" },
  args: {
    model: { type: "string", description: "Model override", required: false },
  },
  async run() {
    await withRunDb(async (db) => {
      const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
      const entity = createEntity({ db, workspace });

      console.log(style.dim("Attuning souls..."));

      const result = await runAttune(entity, db);

      console.log(style.cyan("Attunement complete"));
      console.log(`  Pending shards:  ${result.totalPendingShards}`);
      console.log(`  Crystallizing:   ${result.crystallizingCount}`);
      console.log(`  Phase 1:         ${result.phaseOneMs}ms`);
      if (result.phaseTwoRan) {
        console.log(`  Phase 2 soul:    ${result.phaseTwoSoul}`);
        console.log(`  Phase 2 cost:    $${result.phaseTwoCostUsd?.toFixed(4) ?? "?"}`);
      } else {
        console.log(style.dim("  Phase 2:         skipped (no soul ready)"));
      }
    });
  },
});
