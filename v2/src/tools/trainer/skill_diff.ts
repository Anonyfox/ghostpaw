import { createTool, Schema } from "chatoyant";
import { skillDiff } from "../../core/skills/index.ts";

class SkillDiffParams extends Schema {
  name = Schema.String({
    description: "Exact skill name (folder name under skills/, e.g. 'deploy', 'testing').",
  });
}

export function createSkillDiffTool(workspace: string) {
  return createTool({
    name: "skill_diff",
    description:
      "Show uncommitted changes for a specific skill since the last checkpoint. " +
      "Returns a unified diff of all modified files in the skill folder. " +
      "Use this to review what changed before deciding whether to checkpoint.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new SkillDiffParams() as any,
    async execute({ args }) {
      const { name } = args as { name: string };
      if (!name?.trim()) return { error: "name is required." };

      try {
        const diff = skillDiff(workspace, name.trim());
        return { name: name.trim(), diff: diff ?? "No uncommitted changes." };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
