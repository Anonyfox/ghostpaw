import { resolve } from "node:path";
import {
  allSkillRanks,
  listSkills,
  pendingChanges,
  pendingFragmentCount,
  pendingProposals,
} from "../../../../core/skills/api/read/index.ts";
import type { Entity } from "../../../../harness/index.ts";
import {
  buildCreateExecutePrompt,
  buildCreateProposePrompt,
  invokeTrainerExecute,
  invokeTrainerPropose,
  parseTrainerOptions,
  runStoke,
} from "../../../../harness/index.ts";
import { executeSkillTraining, proposeSkillTraining } from "../../../../harness/public/skills.ts";
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
    async createPropose(ctx: RouteContext): Promise<void> {
      const ent = requireEntity(ctx);
      if (!ent) return;

      let body: unknown;
      try {
        body = await readJsonBody(ctx.req);
      } catch {
        body = {};
      }

      const { topic } = (body ?? {}) as Record<string, unknown>;
      const dir = typeof topic === "string" && topic.trim() ? topic.trim() : undefined;

      try {
        const prompt = buildCreateProposePrompt(dir);
        const result = await invokeTrainerPropose(ent, db, prompt, { purpose: "create" });
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

    async createExecute(ctx: RouteContext): Promise<void> {
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
        const prompt = buildCreateExecutePrompt(title, desc, extra);
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
      try {
        const result = await proposeSkillTraining(ent, db, workspace, name);
        if (!result.ok) {
          json(ctx, 404, { error: result.error });
          return;
        }
        json(ctx, 200, {
          options: result.options,
          rawContent: result.rawContent,
          sessionId: result.sessionId,
          cost: { totalUsd: result.costUsd },
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
      const extra = typeof guidance === "string" ? guidance : undefined;

      try {
        const result = await executeSkillTraining(
          ent,
          db,
          workspace,
          sessionId,
          name,
          ((body as Record<string, unknown>)._rawContent as string) ?? "",
          typeof optionId === "string" ? optionId : undefined,
          extra,
        );

        json(ctx, 200, {
          content: result.content,
          succeeded: result.succeeded,
          cost: { totalUsd: result.costUsd },
          skillName: name,
          newRank: result.newRank,
          newTier: result.newTier,
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    async stoke(ctx: RouteContext): Promise<void> {
      const ent = requireEntity(ctx);
      if (!ent) return;

      try {
        const result = await runStoke(ent, db, workspace);
        json(ctx, 200, result);
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    async status(ctx: RouteContext): Promise<void> {
      try {
        const skills = listSkills(workspace, db);
        const ranks = allSkillRanks(workspace);
        const pending = pendingChanges(workspace);
        const totalRanks = Object.values(ranks).reduce((a, b) => a + b, 0);
        const pendingCount = pending.skills.filter((p) => p.totalChanges > 0).length;
        const fragCount = pendingFragmentCount(db);
        const proposalCount = pendingProposals(db).length;

        json(ctx, 200, {
          skillCount: skills.length,
          totalRanks,
          pendingChanges: pendingCount,
          trainerAvailable: entity != null,
          fragmentCount: fragCount,
          proposalCount,
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },
  };
}
