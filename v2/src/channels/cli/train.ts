import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineCommand } from "citty";
import { listSkills } from "../../core/skills/index.ts";
import {
  buildTrainExecutePrompt,
  buildTrainProposePrompt,
  createEntity,
  invokeTrainerExecute,
  invokeTrainerPropose,
  parseTrainerOptions,
} from "../../harness/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { promptChoice, promptSkillPick } from "./prompt_choice.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "train", description: "Improve an existing skill via the Trainer" },
  args: {
    skill: {
      type: "positional",
      description: "Skill name to train (optional — will prompt if omitted)",
      required: false,
    },
    model: { type: "string", description: "Model override", required: false },
  },
  async run({ args }) {
    await withRunDb(async (db) => {
      const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
      const entity = createEntity({ db, workspace });
      const model = args.model as string | undefined;

      let skillName = (args._ ?? []).join(" ") || (args.skill as string | undefined) || undefined;

      if (!skillName?.trim()) {
        const skills = listSkills(workspace);
        if (skills.length === 0) {
          console.log(style.dim("No skills found. Run `ghostpaw scout` to create one."));
          return;
        }
        const names = skills.map((s) => s.name);
        skillName = await promptSkillPick(names);
        if (!skillName) {
          console.log(style.dim("Cancelled."));
          return;
        }
      }

      const name = skillName.trim();
      let content: string;
      try {
        content = readFileSync(join(workspace, "skills", name, "SKILL.md"), "utf-8");
      } catch {
        console.error(style.boldRed("error".padStart(10)), ` Skill "${name}" not found.`);
        process.exitCode = 1;
        return;
      }

      console.log(style.dim(`Reviewing: ${name}...`));

      const proposePrompt = buildTrainProposePrompt(name, content);
      const proposal = await invokeTrainerPropose(entity, db, proposePrompt, {
        model,
        purpose: "train",
      });

      if (!proposal.succeeded) {
        console.error(style.boldRed("error".padStart(10)), ` Analysis failed: ${proposal.content}`);
        process.exitCode = 1;
        return;
      }

      const options = parseTrainerOptions(proposal.content);
      if (options.length === 0) {
        console.log(style.dim("No improvements identified."));
        console.log(style.dim(`Cost: $${proposal.cost.estimatedUsd.toFixed(4)}`));
        return;
      }

      const choice = await promptChoice(options);
      if (!choice.optionId && !choice.guidance) {
        console.log(style.dim("Cancelled."));
        return;
      }

      const selected = options.find((o) => o.id === choice.optionId);
      const title = selected?.title ?? choice.guidance ?? "Improve skill";
      const desc = selected?.description ?? choice.guidance ?? "";

      console.log(style.dim(`Improving: ${title}...`));

      const executePrompt = buildTrainExecutePrompt(name, title, desc, choice.guidance);
      const result = await invokeTrainerExecute(entity, db, proposal.sessionId, executePrompt, {
        model,
      });

      if (!result.succeeded) {
        console.error(style.boldRed("error".padStart(10)), ` Training failed: ${result.content}`);
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(result.content);
      console.log();
      const totalCost = proposal.cost.estimatedUsd + result.cost.estimatedUsd;
      console.log(style.dim(`Total cost: $${totalCost.toFixed(4)}`));
    });
  },
});
