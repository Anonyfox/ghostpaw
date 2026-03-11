import { resolve } from "node:path";
import { defineCommand } from "citty";
import { resolveSoul } from "../../core/souls/api/read/index.ts";
import { buildRefinePrompt, createEntity, invokeMentor } from "../../harness/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "refine", description: "Ask the mentor to refine a soul based on feedback" },
  args: {
    name: {
      type: "positional",
      description: "Soul ID or name (e.g. 2, 'JS Engineer')",
      required: true,
    },
    feedback: {
      type: "positional",
      description: "Feedback or observation to guide the mentor",
      required: true,
    },
  },
  async run({ args }) {
    const positionals = args._ ?? [];
    const soulArg = (args.name as string) || positionals[0] || "";
    const feedback = (args.feedback as string) || positionals.slice(1).join(" ") || "";

    if (!soulArg?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Soul ID or name is required.");
      process.exitCode = 1;
      return;
    }
    if (!feedback?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Feedback text is required.");
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
      const prompt = buildRefinePrompt(soul.name, feedback.trim());

      console.log(style.dim(`Refining "${soul.name}" via mentor...`));
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
