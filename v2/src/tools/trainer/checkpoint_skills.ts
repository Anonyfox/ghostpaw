import { createTool, Schema } from "chatoyant";
import { checkpoint } from "../../core/skills/index.ts";

class CheckpointSkillsParams extends Schema {
  skills = Schema.String({
    description: 'JSON array of skill names to checkpoint, e.g. \'["deploy","testing"]\'.',
  });
  message = Schema.String({
    description:
      "Commit message describing the improvement. Should explain what changed and why " +
      "it makes the skill more reliable.",
  });
}

export function createCheckpointSkillsTool(workspace: string) {
  return createTool({
    name: "checkpoint_skills",
    description:
      "Commit pending changes for the specified skills, advancing their rank by 1. " +
      "This is a quality gate — only checkpoint improvements that were validated " +
      "in real sessions. Each checkpoint is permanent and becomes part of the skill's " +
      "evolution history.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new CheckpointSkillsParams() as any,
    async execute({ args }) {
      const { skills, message } = args as { skills: string; message: string };

      if (!skills?.trim()) {
        return { error: "skills is required (JSON array of skill names)." };
      }
      if (!message?.trim()) {
        return { error: "message is required." };
      }

      let names: string[];
      try {
        names = JSON.parse(skills);
      } catch {
        return { error: "skills must be a valid JSON array of skill names." };
      }
      if (!Array.isArray(names) || names.some((n) => typeof n !== "string")) {
        return { error: "skills must be a JSON array of strings." };
      }

      try {
        return checkpoint(workspace, names, message.trim());
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
