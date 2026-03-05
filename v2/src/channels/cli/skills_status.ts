import { resolve } from "node:path";
import { defineCommand } from "citty";
import { listSkills, pendingChanges } from "../../core/skills/index.ts";
import { style } from "../../lib/terminal/index.ts";

export default defineCommand({
  meta: { name: "status", description: "Show skill growth status" },
  async run() {
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    const skills = listSkills(workspace);
    const changes = pendingChanges(workspace);

    const totalRanks = skills.reduce((sum, s) => sum + s.rank, 0);
    const avgRank = skills.length > 0 ? (totalRanks / skills.length).toFixed(1) : "0";

    console.log(style.cyan("Skill Growth Status"));
    console.log();
    console.log(`  Skills:          ${skills.length}`);
    console.log(`  Total ranks:     ${totalRanks}`);
    console.log(`  Average rank:    ${avgRank}`);
    console.log(`  Pending changes: ${changes.totalChanges}`);

    if (changes.skills.length > 0) {
      console.log();
      console.log(style.dim("Skills with uncommitted changes:"));
      for (const s of changes.skills) {
        const parts: string[] = [];
        if (s.created.length > 0) parts.push(`+${s.created.length} new`);
        if (s.modified.length > 0) parts.push(`~${s.modified.length} modified`);
        if (s.deleted.length > 0) parts.push(`-${s.deleted.length} deleted`);
        console.log(`  ${style.yellow(s.name)} ${style.dim(parts.join(", "))}`);
      }
    }
  },
});
