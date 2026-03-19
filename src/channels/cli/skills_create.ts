import { resolve } from "node:path";
import { defineCommand } from "citty";
import {
  buildCreateExecutePrompt,
  buildCreateProposePrompt,
  createEntity,
  invokeTrainerExecute,
  invokeTrainerPropose,
  parseTrainerOptions,
} from "../../harness/index.ts";
import { formatRankUp } from "../../lib/format_rankup.ts";
import { style } from "../../lib/terminal/index.ts";
import { promptChoice } from "./prompt_choice.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "create", description: "Discover and create new skills via the Trainer" },
  args: {
    topic: {
      type: "positional",
      description: "Focus topic (optional — omit for friction mining)",
      required: false,
    },
    model: { type: "string", description: "Model override", required: false },
  },
  async run({ args }) {
    await withRunDb(async (db) => {
      const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
      const entity = createEntity({ db, workspace });
      const topic = (args._ ?? []).join(" ") || (args.topic as string | undefined) || undefined;
      const model = args.model as string | undefined;

      console.log(style.dim(topic ? `Exploring: ${topic}` : "Friction mining for skill gaps..."));

      const proposePrompt = buildCreateProposePrompt(topic?.trim() || undefined);
      const proposal = await invokeTrainerPropose(entity, db, proposePrompt, {
        model,
        purpose: "create",
      });

      if (!proposal.succeeded) {
        console.error(
          style.boldRed("error".padStart(10)),
          ` Exploration failed: ${proposal.content}`,
        );
        process.exitCode = 1;
        return;
      }

      const options = parseTrainerOptions(proposal.content);
      if (options.length === 0) {
        console.log(style.dim("No skill opportunities found."));
        console.log(style.dim(`Cost: $${proposal.cost.estimatedUsd.toFixed(4)}`));
        return;
      }

      const choice = await promptChoice(options);
      if (!choice.optionId && !choice.guidance) {
        console.log(style.dim("Cancelled."));
        return;
      }

      const selected = options.find((o) => o.id === choice.optionId);
      const title = selected?.title ?? choice.guidance ?? "Create new skill";
      const desc = selected?.description ?? choice.guidance ?? "";

      console.log(style.dim(`Creating skill: ${title}...`));

      const executePrompt = buildCreateExecutePrompt(title, desc, choice.guidance);
      const result = await invokeTrainerExecute(entity, db, proposal.sessionId, executePrompt, {
        model,
      });

      if (!result.succeeded) {
        console.error(
          style.boldRed("error".padStart(10)),
          ` Skill creation failed: ${result.content}`,
        );
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(result.content);
      console.log(`\x1b[36m  ▲ ${formatRankUp("(new skill)", 1)}!\x1b[0m`);
      console.log();
      const totalCost = proposal.cost.estimatedUsd + result.cost.estimatedUsd;
      console.log(style.dim(`Total cost: $${totalCost.toFixed(4)}`));
    });
  },
});
