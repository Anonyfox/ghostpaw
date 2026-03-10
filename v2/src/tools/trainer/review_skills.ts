import { createTool, Schema } from "chatoyant";
import { listSkills, pendingChanges } from "../../core/skills/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ReviewSkillsParams extends Schema {}

export function createReviewSkillsTool(workspace: string, db?: DatabaseHandle) {
  return createTool({
    name: "review_skills",
    description:
      "Gather a comprehensive overview of all skills. Returns every skill with its name, " +
      "description, rank, tier, readiness color, pending changes, file count, and body size. " +
      "Also includes aggregate stats. Always call this BEFORE checkpoint, rollback, or any " +
      "skill modification to understand current state.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ReviewSkillsParams() as any,
    async execute() {
      try {
        const skills = listSkills(workspace, db);
        const changes = pendingChanges(workspace);
        const totalRanks = skills.reduce((sum, s) => sum + s.rank, 0);
        const avgRank = skills.length > 0 ? totalRanks / skills.length : 0;

        return {
          skillCount: skills.length,
          totalRanks,
          averageRank: Math.round(avgRank * 100) / 100,
          pendingChanges: changes.totalChanges,
          skillsWithChanges: changes.skills.map((s) => s.name),
          skills: skills.map((s) => ({
            name: s.name,
            description: s.description,
            rank: s.rank,
            tier: s.tier,
            readiness: s.readiness,
            hasPendingChanges: s.hasPendingChanges,
            fileCount: s.fileCount,
            bodyLines: s.bodyLines,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
