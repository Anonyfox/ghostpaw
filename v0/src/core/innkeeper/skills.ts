/**
 * Ad-hoc affinity skills surfacing.
 *
 * Provides listing and reading of affinity's 11 built-in workflow playbooks,
 * plus a chatoyant tool for LLM access.
 */

import { skills } from "@ghostpaw/affinity";
import type { Tool } from "chatoyant";

export interface SkillSummary {
  name: string;
  description: string;
}

export function listAffinitySkills(): SkillSummary[] {
  return skills.affinitySkills.map((s) => ({ name: s.name, description: s.description }));
}

export function getAffinitySkill(name: string): string | undefined {
  const skill = skills.getAffinitySkillByName(name);
  return skill?.content;
}

export function createAffinitySkillsTool(): Tool {
  return {
    name: "affinity_skills",
    description:
      "List or read affinity relationship-management workflow playbooks. " +
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
        const list = listAffinitySkills();
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
        const content = getAffinitySkill(args.name);
        if (!content) {
          const available = listAffinitySkills().map((s) => s.name);
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
