import { resolve } from "node:path";
import { defineCommand } from "citty";
import { createEntity, runEmbark } from "../../harness/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "embark", description: "Autonomously execute a quest" },
  args: {
    id: {
      type: "positional",
      description: "Quest ID to embark on",
      required: true,
    },
    model: {
      type: "string",
      alias: "m",
      description: "Model override",
    },
  },
  async run({ args }) {
    const raw = (args._ ?? [])[0] || (args.id as string);
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      console.error(style.boldRed("error"), "Quest ID must be a positive integer.");
      process.exitCode = 1;
      return;
    }

    await withRunDb(async (db) => {
      const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
      const entity = createEntity({ db, workspace });
      const model = args.model as string | undefined;

      console.log(style.dim(`embarking on quest #${id}...`));

      const result = await runEmbark(entity, db, workspace, id, { model });

      console.log();
      if (result.succeeded) {
        console.log(style.cyan("done"), `quest #${id} completed in ${result.turns} turns`);
      } else {
        console.log(
          style.yellow("paused"),
          `quest #${id} after ${result.turns} turns (status: ${result.finalStatus})`,
        );
      }
      const xpStr = result.xp > 0 ? ` | ${Math.round(result.xp)} XP` : "";
      console.log(
        style.dim(
          `session #${result.sessionId} | ` +
            `${result.usage.tokensIn + result.usage.tokensOut} tokens | ` +
            `$${result.cost.toFixed(4)}${xpStr}`,
        ),
      );
    });
  },
});
