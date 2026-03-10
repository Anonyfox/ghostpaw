import { resolve } from "node:path";
import { defineCommand } from "citty";
import {
  listSkills,
  pendingChanges,
  pendingFragmentCount,
  pendingProposals,
  readSkillHealth,
} from "../../core/skills/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "status", description: "Show skill growth status" },
  async run() {
    await withRunDb(async (db) => {
      const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
      const skills = listSkills(workspace, db);
      const changes = pendingChanges(workspace);
      const fragCount = pendingFragmentCount(db);
      const proposals = pendingProposals(db);
      const health = readSkillHealth(db);

      const totalRanks = skills.reduce((sum, s) => sum + s.rank, 0);
      const avgRank = skills.length > 0 ? (totalRanks / skills.length).toFixed(1) : "0";

      console.log(style.cyan("Skill Growth Status"));
      console.log();
      console.log(`  Skills:          ${skills.length}`);
      console.log(`  Total ranks:     ${totalRanks}`);
      console.log(`  Average rank:    ${avgRank}`);
      console.log(`  Pending changes: ${changes.totalChanges}`);
      console.log(`  Fragments:       ${fragCount} pending`);
      console.log(`  Proposals:       ${proposals.length} queued`);

      if (health) {
        const stokeAge = Math.floor(Date.now() / 1000) - health.computedAt;
        const stokeAgo =
          stokeAge < 3600
            ? `${Math.floor(stokeAge / 60)}m ago`
            : `${Math.floor(stokeAge / 3600)}h ago`;
        console.log(`  Last stoke:      ${stokeAgo}`);
        if (health.oversizedSkills.length > 0) {
          console.log(`  Oversized:       ${style.yellow(health.oversizedSkills.join(", "))}`);
        }
      } else {
        console.log(style.dim("  Last stoke:      never"));
      }

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

      if (proposals.length > 0) {
        console.log();
        console.log(style.dim("Pending proposals:"));
        for (const p of proposals) {
          console.log(`  ${style.cyan(p.title)}: ${style.dim(p.rationale)}`);
        }
      }
    });
  },
});
