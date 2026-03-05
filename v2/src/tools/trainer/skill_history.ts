import { createTool, Schema } from "chatoyant";
import { skillHistory } from "../../core/skills/index.ts";

class SkillHistoryParams extends Schema {
  name = Schema.String({
    description: "Exact skill name (folder name under skills/, e.g. 'deploy', 'testing').",
  });
}

export function createSkillHistoryTool(workspace: string) {
  return createTool({
    name: "skill_history",
    description:
      "Show the checkpoint history (commit log) for a specific skill. " +
      "Each entry includes the commit hash, message, and timestamp. " +
      "The number of entries equals the skill's rank. Use this to understand " +
      "a skill's evolution or to find a hash for rollback.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new SkillHistoryParams() as any,
    async execute({ args }) {
      const { name } = args as { name: string };
      if (!name?.trim()) return { error: "name is required." };

      try {
        const entries = skillHistory(workspace, name.trim());
        if (entries.length === 0) {
          return { name: name.trim(), entries: [], message: "No history found." };
        }
        return { name: name.trim(), entries };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
