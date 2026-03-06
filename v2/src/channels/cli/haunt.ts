import { resolve } from "node:path";
import { defineCommand } from "citty";
import { createEntity, runHaunt } from "../../harness/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "haunt", description: "Trigger a haunt cycle — the ghost thinks privately" },
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

      console.log(style.dim("haunting..."));

      const result = await runHaunt(entity, db, workspace, { model });

      if (!result.succeeded) {
        console.error(style.boldRed("error".padStart(10)), " haunt cycle failed");
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(style.cyan("summary"), result.haunt.summary);
      if (result.consolidation) {
        const tc = result.consolidation.toolCalls;
        const memOps = tc.remember + tc.revise + tc.forget;
        if (memOps > 0) {
          console.log(
            style.dim(
              `  memories: +${tc.remember} new, ${tc.revise} revised, ${tc.forget} forgotten`,
            ),
          );
        }
        if (result.consolidation.highlight) {
          console.log(style.cyan("highlight"), result.consolidation.highlight);
        }
      }
      console.log();
      console.log(
        style.dim(
          `session #${result.sessionId} | ` +
            `${result.usage.inputTokens + result.usage.outputTokens} tokens | ` +
            `$${result.cost.estimatedUsd.toFixed(4)}`,
        ),
      );
    });
  },
});
