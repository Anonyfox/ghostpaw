import { resolve } from "node:path";
import { defineCommand } from "citty";
import { checkpoint } from "../../core/skills/index.ts";
import { style } from "../../lib/terminal/index.ts";

export default defineCommand({
  meta: { name: "checkpoint", description: "Commit skill changes as a new rank" },
  args: {
    skills: { type: "positional", description: "Skill names (comma-separated)", required: true },
    message: { type: "string", alias: "m", description: "Commit message", required: true },
  },
  async run({ args }) {
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    const names = (args.skills as string).split(",").map((s) => s.trim()).filter(Boolean);

    if (names.length === 0) {
      console.log(style.dim("No skill names provided."));
      return;
    }

    try {
      const result = checkpoint(workspace, names, args.message as string);
      if (result.committed) {
        console.log(
          style.cyan(`Checkpoint ${result.commitHash ?? ""}: ${result.skills.join(", ")}`),
        );
        console.log(style.dim(result.message));
      } else {
        console.log(style.dim("No changes to commit."));
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  },
});
