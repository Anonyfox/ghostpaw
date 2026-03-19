import { resolve } from "node:path";
import { defineCommand } from "citty";
import { createEntity, runStoke } from "../../harness/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "stoke", description: "Run the nightly forge maintenance (Stoke)" },
  args: {
    "skip-phase-two": {
      type: "boolean",
      description: "Only run Phase 1 (zero LLM cost)",
      required: false,
    },
    model: { type: "string", description: "Model override", required: false },
  },
  async run({ args }) {
    await withRunDb(async (db) => {
      const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
      const entity = createEntity({ db, workspace });
      const skipPhaseTwo = args["skip-phase-two"] as boolean | undefined;

      console.log(style.dim("Stoking the forge..."));

      const result = await runStoke(entity, db, workspace, { skipPhaseTwo });

      console.log(style.cyan("Stoke complete"));
      console.log(`  Skills:          ${result.health.totalSkills}`);
      console.log(`  Repairs:         ${result.health.repairsApplied}`);
      console.log(`  Fragments:       ${result.health.pendingFragments} pending`);
      console.log(`  Phase 1:         ${result.phaseOneMs}ms`);
      if (result.phaseTwoRan) {
        console.log(`  Phase 2:         $${result.phaseTwoCostUsd?.toFixed(4) ?? "?"}`);
        console.log(`  Proposals:       ${result.health.proposalsQueued}`);
      } else {
        console.log(style.dim("  Phase 2:         skipped"));
      }
    });
  },
});
