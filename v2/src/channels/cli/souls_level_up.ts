import { resolve } from "node:path";
import { defineCommand } from "citty";
import { resolveSoul } from "../../core/souls/index.ts";
import { buildLevelUpPrompt, createEntity, invokeMentor } from "../../harness/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "level-up", description: "Ask the mentor to orchestrate a soul level-up" },
  args: {
    name: {
      type: "positional",
      description: "Soul ID or name (e.g. 2, 'JS Engineer')",
      required: true,
    },
  },
  async run({ args }) {
    const soulArg = (args._ ?? []).join(" ") || (args.name as string);
    if (!soulArg?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Soul ID or name is required.");
      process.exitCode = 1;
      return;
    }

    await withRunDb(async (db) => {
      const soul = resolveSoul(db, soulArg);
      if (!soul) {
        console.error(style.boldRed("error".padStart(10)), ` Soul "${soulArg}" not found.`);
        process.exitCode = 1;
        return;
      }

      const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
      const entity = createEntity({ db, workspace });
      const prompt = buildLevelUpPrompt(soul.name);

      console.log(style.dim(`Orchestrating level-up for "${soul.name}" via mentor...`));
      const result = await invokeMentor(entity, db, prompt);

      if (!result.succeeded) {
        console.error(style.boldRed("error".padStart(10)), ` Mentor failed: ${result.content}`);
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(result.content);
      console.log();
      console.log(style.dim(`Cost: $${result.cost.estimatedUsd.toFixed(4)}`));
    });
  },
});
