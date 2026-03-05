import { resolve } from "node:path";
import { defineCommand } from "citty";
import { listSkills } from "../../core/skills/index.ts";
import { style } from "../../lib/terminal/index.ts";

export default defineCommand({
  meta: { name: "list", description: "List all skills with ranks and status" },
  async run() {
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    const skills = listSkills(workspace);

    if (skills.length === 0) {
      console.log(style.dim("No skills found."));
      return;
    }

    console.log(style.dim(`${skills.length} skill${skills.length === 1 ? "" : "s"}`));

    const header = `${"Name".padEnd(25)} ${"Rank".padStart(5)} ${"Files".padStart(5)} ${"Lines".padStart(6)} ${"Description".padEnd(40)}`;
    console.log(style.dim(header));
    console.log(style.dim("─".repeat(86)));

    for (const s of skills) {
      const name = s.hasPendingChanges ? style.yellow(s.name.padEnd(25)) : s.name.padEnd(25);
      const rank = String(s.rank).padStart(5);
      const files = String(s.fileCount).padStart(5);
      const lines = String(s.bodyLines).padStart(6);
      const desc =
        s.description.length > 38 ? `${s.description.slice(0, 37)}…` : s.description.padEnd(38);
      console.log(`${name} ${rank} ${style.dim(files)} ${style.dim(lines)} ${style.dim(desc)}`);
    }
  },
});
