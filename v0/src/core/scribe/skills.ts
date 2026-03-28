/**
 * Ad-hoc codex skills surfacing.
 *
 * This is a temporary bridge until the full skills subsystem comes online.
 * Provides listing and reading of codex's 17 built-in workflow playbooks,
 * plus a chatoyant tool for LLM access.
 */

import { skills } from "@ghostpaw/codex";
import type { Tool } from "chatoyant";

export interface SkillSummary {
  name: string;
  description: string;
}

export function listCodexSkills(): SkillSummary[] {
  return skills.codexSkills.map((s) => ({ name: s.name, description: s.description }));
}

export function getCodexSkill(name: string): string | undefined {
  const skill = skills.getCodexSkillByName(name);
  return skill?.content;
}

export function createCodexSkillsTool(): Tool {
  return {
    name: "codex_skills",
    description:
      "List or read codex belief-management workflow playbooks. " +
      "Call with action 'list' to see all available skills, or action 'read' " +
      "with a skill name to get the full playbook content.",
    getParametersSchema() {
      return {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["list", "read"],
            description: "Whether to list all skills or read a specific one.",
          },
          name: {
            type: "string",
            description:
              "The skill name to read (required when action is 'read'). " +
              "Use the 'list' action first to discover available names.",
          },
        },
        required: ["action"],
      };
    },
    async executeCall(call: { id: string; name: string; args: unknown }) {
      const args = call.args as { action: string; name?: string };

      if (args.action === "list") {
        const list = listCodexSkills();
        return {
          id: call.id,
          result: { skills: list, count: list.length },
          success: true,
        };
      }

      if (args.action === "read") {
        if (!args.name) {
          return {
            id: call.id,
            result: { error: "Missing 'name' parameter for read action." },
            success: false,
          };
        }
        const content = getCodexSkill(args.name);
        if (!content) {
          const available = listCodexSkills().map((s) => s.name);
          return {
            id: call.id,
            result: {
              error: `Skill '${args.name}' not found.`,
              available,
            },
            success: false,
          };
        }
        return {
          id: call.id,
          result: { name: args.name, content },
          success: true,
        };
      }

      return {
        id: call.id,
        result: { error: `Unknown action '${args.action}'. Use 'list' or 'read'.` },
        success: false,
      };
    },
    // biome-ignore lint/suspicious/noExplicitAny: duck-typed tool shim
  } as any;
}
