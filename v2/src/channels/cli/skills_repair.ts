import { resolve } from "node:path";
import { defineCommand } from "citty";
import { repairFlatFile, repairSkill, validateSkill } from "../../core/skills/index.ts";
import { style } from "../../lib/terminal/index.ts";

export default defineCommand({
  meta: { name: "repair", description: "Auto-repair a skill with validation issues" },
  args: {
    name: { type: "positional", description: "Skill name or flat file name", required: true },
    flat: {
      type: "boolean",
      description: "Treat the name as a flat .md file to migrate",
      default: false,
    },
  },
  async run({ args }) {
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    const name = args.name as string;

    try {
      const result = args.flat ? repairFlatFile(workspace, name) : repairSkill(workspace, name);

      if (result.actions.length === 0) {
        console.log(style.dim("No repairs needed."));
      } else {
        for (const action of result.actions) {
          const status = action.applied ? style.green("applied") : style.yellow("skipped");
          console.log(`  ${status}: ${action.description}`);
        }
      }

      if (result.remainingIssues.length > 0) {
        console.log();
        console.log(style.dim("Remaining issues (manual fix required):"));
        for (const issue of result.remainingIssues) {
          console.log(`  ${style.yellow(issue.severity)}: ${issue.message}`);
        }
      }

      const validation = validateSkill(workspace, result.name);
      if (validation.valid) {
        console.log(style.green(`\n${result.name} is now valid.`));
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  },
});
