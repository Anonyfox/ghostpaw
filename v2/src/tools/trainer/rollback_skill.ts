import { createTool, Schema } from "chatoyant";
import { rollback } from "../../core/skills/index.ts";

class RollbackSkillParams extends Schema {
  name = Schema.String({
    description: "Exact skill name (folder name under skills/).",
  });
  hash = Schema.String({
    description: "Commit hash to rollback to. Use skill_history to find valid hashes.",
  });
}

export function createRollbackSkillTool(workspace: string) {
  return createTool({
    name: "rollback_skill",
    description:
      "Revert a skill to a previous checkpoint version identified by commit hash. " +
      "Use skill_history to find the target hash. The rollback restores all files " +
      "in the skill folder to that checkpoint's state.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new RollbackSkillParams() as any,
    async execute({ args }) {
      const { name, hash } = args as { name: string; hash: string };

      if (!name?.trim()) return { error: "name is required." };
      if (!hash?.trim()) return { error: "hash is required." };

      try {
        const success = rollback(workspace, name.trim(), hash.trim());
        if (!success) {
          return {
            error: `Rollback failed: commit ${hash.trim()} not found for skill ${name.trim()}.`,
          };
        }
        return { rolled_back: true, name: name.trim(), hash: hash.trim() };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
