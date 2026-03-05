import { resolve } from "node:path";
import {
  getSkill,
  listSkills,
  skillPendingChanges,
  skillRank,
  validateSkill,
} from "../../../../core/skills/index.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

export function createSkillsApiHandlers() {
  const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");

  return {
    list(ctx: RouteContext): void {
      try {
        const skills = listSkills(workspace);
        json(ctx, 200, skills);
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    detail(ctx: RouteContext): void {
      const name = ctx.params.name;
      if (!name) {
        json(ctx, 400, { error: "Missing skill name." });
        return;
      }

      try {
        const skill = getSkill(workspace, name);
        if (!skill) {
          json(ctx, 404, { error: `Skill "${name}" not found.` });
          return;
        }

        const rank = skillRank(workspace, name);
        const pending = skillPendingChanges(workspace, name);
        const validation = validateSkill(workspace, name);

        json(ctx, 200, {
          name: skill.name,
          description: skill.description,
          body: skill.body,
          rank,
          hasPendingChanges: pending.totalChanges > 0,
          files: skill.files,
          validation: {
            valid: validation.valid,
            issues: validation.issues.map((i) => ({
              severity: i.severity,
              code: i.code,
              message: i.message,
            })),
          },
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    validate(ctx: RouteContext): void {
      const name = ctx.params.name;
      if (!name) {
        json(ctx, 400, { error: "Missing skill name." });
        return;
      }

      try {
        const result = validateSkill(workspace, name);
        json(ctx, 200, result);
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },
  };
}
