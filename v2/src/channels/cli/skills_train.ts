import { resolve } from "node:path";
import { defineCommand } from "citty";
import { listSkills, skillRank } from "../../core/skills/api/read/index.ts";
import { createEntity, parseTrainerOptions } from "../../harness/index.ts";
import { executeSkillTraining, proposeSkillTraining } from "../../harness/public/skills.ts";
import { formatRankUp } from "../../lib/format_rankup.ts";
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
        const skills = listSkills(workspace, db);
        if (skills.length === 0) {
          console.log(style.dim("No skills found. Run `ghostpaw skills create` to create one."));
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

      console.log(style.dim(`Reviewing: ${name}...`));

      const proposal = await proposeSkillTraining(entity, db, workspace, name, model);
      if (!proposal.ok) {
        console.error(style.boldRed("error".padStart(10)), ` ${proposal.error}`);
        process.exitCode = 1;
        return;
      }

      const options =
        proposal.options.length > 0 ? proposal.options : parseTrainerOptions(proposal.rawContent);
      if (options.length === 0) {
        console.log(style.dim("No improvements identified."));
        console.log(style.dim(`Cost: $${proposal.costUsd.toFixed(4)}`));
        return;
      }

      const choice = await promptChoice(options);
      if (!choice.optionId && !choice.guidance) {
        console.log(style.dim("Cancelled."));
        return;
      }

      const selected = options.find((o) => o.id === choice.optionId);
      const title = selected?.title ?? choice.guidance ?? "Improve skill";

      console.log(style.dim(`Improving: ${title}...`));

      const rankBefore = skillRank(workspace, name);

      const result = await executeSkillTraining(
        entity,
        db,
        workspace,
        proposal.sessionId,
        name,
        proposal.rawContent,
        choice.optionId,
        choice.guidance,
        model,
      );

      if (!result.succeeded) {
        console.error(style.boldRed("error".padStart(10)), ` Training failed: ${result.content}`);
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(result.content);

      const rankAfter = result.newRank ?? skillRank(workspace, name);
      if (rankAfter > rankBefore) {
        console.log(`\x1b[36m  ▲ ${formatRankUp(name, rankAfter)}!\x1b[0m`);
      }

      console.log();
      const totalCost = proposal.costUsd + result.costUsd;
      console.log(style.dim(`Total cost: $${totalCost.toFixed(4)}`));
    });
  },
});
