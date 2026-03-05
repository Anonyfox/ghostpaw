import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  allSkillRanks,
  listSkills,
  pendingChanges,
  skillRank,
} from "../../../../core/skills/index.ts";
import type { Entity } from "../../../../harness/index.ts";
import {
  buildScoutExecutePrompt,
  buildScoutProposePrompt,
  buildTrainExecutePrompt,
  buildTrainProposePrompt,
  invokeTrainerExecute,
  invokeTrainerPropose,
  parseTrainerOptions,
} from "../../../../harness/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

export function createTrainerApiHandlers(db: DatabaseHandle, entity: Entity | undefined) {
  function requireEntity(ctx: RouteContext): Entity | null {
    if (!entity) {
      json(ctx, 503, { error: "Entity not available." });
      return null;
    }
    return entity;
  }

  const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");

  return {
    async scoutPropose(ctx: RouteContext): Promise<void> {
      const ent = requireEntity(ctx);
      if (!ent) return;

      let body: unknown;
      try {
        body = await readJsonBody(ctx.req);
      } catch {
        body = {};
      }

      const { direction } = (body ?? {}) as Record<string, unknown>;
      const dir = typeof direction === "string" && direction.trim() ? direction.trim() : undefined;

      try {
        const prompt = buildScoutProposePrompt(dir);
        const result = await invokeTrainerPropose(ent, db, prompt, { purpose: "scout" });
        const options = parseTrainerOptions(result.content);
        json(ctx, 200, {
          options,
          rawContent: result.content,
          sessionId: result.sessionId,
          cost: { totalUsd: result.cost.estimatedUsd },
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    async scoutExecute(ctx: RouteContext): Promise<void> {
      const ent = requireEntity(ctx);
      if (!ent) return;

      let body: unknown;
      try {
        body = await readJsonBody(ctx.req);
      } catch {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }

      const { sessionId, optionId, guidance } = (body ?? {}) as Record<string, unknown>;
      if (typeof sessionId !== "number") {
        json(ctx, 400, { error: "Missing or invalid 'sessionId'." });
        return;
      }

      const options = parseTrainerOptions(
        ((body as Record<string, unknown>)._rawContent as string) ?? "",
      );
      const selected = options.find((o) => o.id === String(optionId));
      const title = selected?.title ?? String(guidance ?? "Create new skill");
      const desc = selected?.description ?? String(guidance ?? "");
      const extra = typeof guidance === "string" ? guidance : undefined;

      try {
        const prompt = buildScoutExecutePrompt(title, desc, extra);
        const result = await invokeTrainerExecute(ent, db, sessionId, prompt);
        json(ctx, 200, {
          content: result.content,
          succeeded: result.succeeded,
          cost: { totalUsd: result.cost.estimatedUsd },
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    async trainPropose(ctx: RouteContext): Promise<void> {
      const ent = requireEntity(ctx);
      if (!ent) return;

      let body: unknown;
      try {
        body = await readJsonBody(ctx.req);
      } catch {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }

      const { skillName } = (body ?? {}) as Record<string, unknown>;
      if (typeof skillName !== "string" || !skillName.trim()) {
        json(ctx, 400, { error: "Missing or empty 'skillName' field." });
        return;
      }

      const name = skillName.trim();
      let content: string;
      try {
        content = readFileSync(join(workspace, "skills", name, "SKILL.md"), "utf-8");
      } catch {
        json(ctx, 404, { error: `Skill "${name}" not found.` });
        return;
      }

      try {
        const prompt = buildTrainProposePrompt(name, content);
        const result = await invokeTrainerPropose(ent, db, prompt, { purpose: "train" });
        const options = parseTrainerOptions(result.content);
        json(ctx, 200, {
          options,
          rawContent: result.content,
          sessionId: result.sessionId,
          cost: { totalUsd: result.cost.estimatedUsd },
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    async trainExecute(ctx: RouteContext): Promise<void> {
      const ent = requireEntity(ctx);
      if (!ent) return;

      let body: unknown;
      try {
        body = await readJsonBody(ctx.req);
      } catch {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }

      const { sessionId, skillName, optionId, guidance } = (body ?? {}) as Record<string, unknown>;
      if (typeof sessionId !== "number") {
        json(ctx, 400, { error: "Missing or invalid 'sessionId'." });
        return;
      }
      if (typeof skillName !== "string" || !skillName.trim()) {
        json(ctx, 400, { error: "Missing or empty 'skillName'." });
        return;
      }

      const name = skillName.trim();
      const options = parseTrainerOptions(
        ((body as Record<string, unknown>)._rawContent as string) ?? "",
      );
      const selected = options.find((o) => o.id === String(optionId));
      const title = selected?.title ?? String(guidance ?? "Improve skill");
      const desc = selected?.description ?? String(guidance ?? "");
      const extra = typeof guidance === "string" ? guidance : undefined;

      try {
        const prompt = buildTrainExecutePrompt(name, title, desc, extra);
        const result = await invokeTrainerExecute(ent, db, sessionId, prompt);

        let newRank: number | undefined;
        try {
          newRank = skillRank(workspace, name);
        } catch {
          /* non-critical */
        }

        json(ctx, 200, {
          content: result.content,
          succeeded: result.succeeded,
          cost: { totalUsd: result.cost.estimatedUsd },
          skillName: name,
          newRank,
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    async status(ctx: RouteContext): Promise<void> {
      try {
        const skills = listSkills(workspace);
        const ranks = allSkillRanks(workspace);
        const pending = pendingChanges(workspace);
        const totalRanks = Object.values(ranks).reduce((a, b) => a + b, 0);
        const pendingCount = pending.skills.filter((p) => p.totalChanges > 0).length;

        json(ctx, 200, {
          skillCount: skills.length,
          totalRanks,
          pendingChanges: pendingCount,
          trainerAvailable: entity != null,
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },
  };
}
