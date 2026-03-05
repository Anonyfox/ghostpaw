import { createTool, Schema } from "chatoyant";
import { listSkills, pendingChanges } from "../../core/skills/index.ts";

class ReviewSkillsParams extends Schema {}

export function createReviewSkillsTool(workspace: string) {
  return createTool({
    name: "review_skills",
    description:
      "Gather a comprehensive overview of all skills. Returns every skill with its name, " +
      "description, rank, pending changes, file count, and body size. Also includes aggregate " +
      "stats: total skills, total ranks, average rank, and which skills have uncommitted changes. " +
      "Always call this BEFORE checkpoint, rollback, or any skill modification to understand " +
      "current state.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ReviewSkillsParams() as any,
    async execute() {
      try {
        const skills = listSkills(workspace);
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
