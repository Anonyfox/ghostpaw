import {
  addTrait,
  reactivateTrait,
  revertTrait,
  reviseTrait,
} from "../../../../core/souls/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";
import { parseTraitAddBody, parseTraitReviseBody } from "./parse_trait_body.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

export function createSoulTraitsApiHandlers(db: DatabaseHandle) {
  return {
    async add(ctx: RouteContext): Promise<void> {
      const soulId = Number(ctx.params.id);
      if (!Number.isFinite(soulId) || soulId < 1) {
        json(ctx, 400, { error: "Invalid soul ID." });
        return;
      }
      const result = await parseTraitAddBody(ctx.req);
      if ("error" in result) {
        json(ctx, 400, { error: result.error });
        return;
      }
      try {
        const trait = addTrait(db, soulId, result);
        json(ctx, 201, { trait });
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    async revise(ctx: RouteContext): Promise<void> {
      const tid = Number(ctx.params.tid);
      if (!Number.isFinite(tid) || tid < 1) {
        json(ctx, 400, { error: "Invalid trait ID." });
        return;
      }
      const result = await parseTraitReviseBody(ctx.req);
      if ("error" in result) {
        json(ctx, 400, { error: result.error });
        return;
      }
      try {
        const trait = reviseTrait(db, tid, result);
        json(ctx, 200, { trait });
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    revert(ctx: RouteContext): void {
      const tid = Number(ctx.params.tid);
      if (!Number.isFinite(tid) || tid < 1) {
        json(ctx, 400, { error: "Invalid trait ID." });
        return;
      }
      try {
        const trait = revertTrait(db, tid);
        json(ctx, 200, { trait });
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    reactivate(ctx: RouteContext): void {
      const tid = Number(ctx.params.tid);
      if (!Number.isFinite(tid) || tid < 1) {
        json(ctx, 400, { error: "Invalid trait ID." });
        return;
      }
      try {
        const trait = reactivateTrait(db, tid);
        json(ctx, 200, { trait });
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },
  };
}
