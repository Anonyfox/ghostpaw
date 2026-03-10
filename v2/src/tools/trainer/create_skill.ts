import { createTool, Schema } from "chatoyant";
import { createSkill } from "../../core/skills/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class CreateSkillParams extends Schema {
  name = Schema.String({
    description:
      "Skill name: lowercase alphanumeric with hyphens only (e.g. 'deploy-vercel', 'testing').",
  });
  description = Schema.String({
    description: "One-line description of what this skill teaches.",
  });
  body = Schema.String({
    description:
      "Markdown body for SKILL.md. Should contain the procedure, tool references, " +
      "and failure paths. Omit to get a minimal placeholder.",
    optional: true,
  });
}

export function createCreateSkillTool(workspace: string, db?: DatabaseHandle) {
  return createTool({
    name: "create_skill",
    description:
      "Scaffold a new skill folder with a properly structured SKILL.md. " +
      "Creates skills/<name>/SKILL.md with YAML frontmatter and the provided body. " +
      "The skill is auto-checkpointed to rank 1 (Apprentice) immediately.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new CreateSkillParams() as any,
    async execute({ args }) {
      const { name, description, body } = args as {
        name: string;
        description: string;
        body?: string;
      };

      if (!name?.trim()) return { error: "name is required." };
      if (!description?.trim()) return { error: "description is required." };

      try {
        const skill = createSkill(
          workspace,
          { name: name.trim(), description: description.trim(), body: body?.trim() },
          db,
        );
        return {
          created: true,
          name: skill.name,
          path: `skills/${skill.name}/SKILL.md`,
          rank: 1,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
