import { runHaunt } from "../../../../harness/index.ts";
import type { Entity } from "../../../../harness/types.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";

export function createHauntApiHandlers(db: DatabaseHandle, entity?: Entity) {
  let running = false;

  return {
    trigger(ctx: RouteContext) {
      const { res } = ctx;
      if (!entity) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Entity not available." }));
        return;
      }
      if (running) {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "A haunt is already running." }));
        return;
      }

      running = true;
      const workspace = entity.workspace;
      runHaunt(entity, db, workspace)
        .catch(() => {})
        .finally(() => {
          running = false;
        });

      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, message: "Haunt triggered." }));
    },

    status(ctx: RouteContext) {
      ctx.res.writeHead(200, { "Content-Type": "application/json" });
      ctx.res.end(JSON.stringify({ running }));
    },
  };
}
