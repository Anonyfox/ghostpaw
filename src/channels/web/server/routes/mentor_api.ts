import { getSoul } from "../../../../core/souls/api/read/index.ts";
import type { Entity } from "../../../../harness/index.ts";
import {
  buildLevelUpPrompt,
  buildRefinePrompt,
  buildReviewPrompt,
  invokeMentor,
} from "../../../../harness/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

function validateSoulId(ctx: RouteContext): number | null {
  const id = Number(ctx.params.id);
  if (!Number.isFinite(id) || id < 1) {
    json(ctx, 400, { error: "Invalid soul ID." });
    return null;
  }
  return id;
}

export function createMentorApiHandlers(db: DatabaseHandle, entity: Entity | undefined) {
  function requireEntity(ctx: RouteContext): Entity | null {
    if (!entity) {
      json(ctx, 503, { error: "Entity not available." });
      return null;
    }
    return entity;
  }

  return {
    async review(ctx: RouteContext): Promise<void> {
      const id = validateSoulId(ctx);
      if (id === null) return;
      const ent = requireEntity(ctx);
      if (!ent) return;

      const soul = getSoul(db, id);
      if (!soul) {
        json(ctx, 404, { error: "Soul not found." });
        return;
      }

      try {
        const prompt = buildReviewPrompt(soul.name);
        const result = await invokeMentor(ent, db, prompt);
        json(ctx, 200, {
          content: result.content,
          succeeded: result.succeeded,
          cost: { totalUsd: result.cost.estimatedUsd },
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    async refine(ctx: RouteContext): Promise<void> {
      const id = validateSoulId(ctx);
      if (id === null) return;
      const ent = requireEntity(ctx);
      if (!ent) return;

      const soul = getSoul(db, id);
      if (!soul) {
        json(ctx, 404, { error: "Soul not found." });
        return;
      }

      let body: unknown;
      try {
        body = await readJsonBody(ctx.req);
      } catch {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }

      const { feedback } = (body ?? {}) as Record<string, unknown>;
      if (typeof feedback !== "string" || !feedback.trim()) {
        json(ctx, 400, { error: "Missing or empty 'feedback' field." });
        return;
      }

      try {
        const prompt = buildRefinePrompt(soul.name, feedback.trim());
        const result = await invokeMentor(ent, db, prompt);
        json(ctx, 200, {
          content: result.content,
          succeeded: result.succeeded,
          cost: { totalUsd: result.cost.estimatedUsd },
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    async levelUp(ctx: RouteContext): Promise<void> {
      const id = validateSoulId(ctx);
      if (id === null) return;
      const ent = requireEntity(ctx);
      if (!ent) return;

      const soul = getSoul(db, id);
      if (!soul) {
        json(ctx, 404, { error: "Soul not found." });
        return;
      }

      try {
        const prompt = buildLevelUpPrompt(soul.name);
        const result = await invokeMentor(ent, db, prompt);
        json(ctx, 200, {
          content: result.content,
          succeeded: result.succeeded,
          cost: { totalUsd: result.cost.estimatedUsd },
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },
  };
}
