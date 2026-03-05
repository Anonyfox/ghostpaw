import { createTool, Schema } from "chatoyant";
import { repairFlatFile, repairSkill, validateAllSkills } from "../../core/skills/index.ts";

class ValidateSkillsParams extends Schema {}

export function createValidateSkillsTool(workspace: string) {
  return createTool({
    name: "validate_skills",
    description:
      "Validate all skills for structural correctness and auto-repair fixable issues. " +
      "Checks SKILL.md presence, frontmatter validity, folder structure, and naming. " +
      "Automatically repairs flat files (SKILL.md without a folder), missing frontmatter, " +
      "and other common issues. Returns a report of all findings and repairs.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ValidateSkillsParams() as any,
    async execute() {
      try {
        const results = validateAllSkills(workspace);
        const repaired: string[] = [];

        for (const v of results) {
          if (!v.valid && v.issues.some((i) => i.autoFixable)) {
            if (v.issues.some((i) => i.code === "flat-file")) {
              repairFlatFile(workspace, v.name);
            } else {
              repairSkill(workspace, v.name);
            }
            repaired.push(v.name);
          }
        }

        return {
          total: results.length,
          valid: results.filter((r) => r.valid).length,
          invalid: results.filter((r) => !r.valid).length,
          repaired,
          details: results
            .filter((r) => !r.valid)
            .map((r) => ({
              name: r.name,
              issues: r.issues.map((i) => ({
                code: i.code,
                message: i.message,
                severity: i.severity,
                autoFixed: i.autoFixable && repaired.includes(r.name),
              })),
            })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
