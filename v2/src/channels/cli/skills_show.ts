import { resolve } from "node:path";
import { defineCommand } from "citty";
import { getSkill, skillRank } from "../../core/skills/index.ts";
import { style } from "../../lib/terminal/index.ts";

export default defineCommand({
  meta: { name: "show", description: "Show full content of a skill" },
  args: {
    name: { type: "positional", description: "Skill name", required: true },
  },
  async run({ args }) {
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    const skill = getSkill(workspace, args.name as string);

    if (!skill) {
      console.log(style.dim(`Skill "${args.name}" not found.`));
      return;
    }

    const rank = skillRank(workspace, skill.name);
    console.log(style.cyan(`# ${skill.name}`));
    console.log(
      style.dim(
        `Rank: ${rank} | Files: ${skill.files.scripts.length + skill.files.references.length + skill.files.assets.length + skill.files.other.length + 1} | Path: skills/${skill.name}/`,
      ),
    );
    console.log();
    console.log(skill.body);
  },
});
