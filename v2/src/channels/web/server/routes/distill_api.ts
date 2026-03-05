import { defaultChatFactory } from "../../../../harness/chat_factory.ts";
import { distillPending } from "../../../../harness/distill_pending.ts";
import { ELIGIBLE_PURPOSES, STALE_THRESHOLD_MS } from "../../../../harness/distill_types.ts";
import { resolveModel } from "../../../../harness/model.ts";
import { distillSession } from "../../../../harness/oneshots/distill_session.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

export function createDistillApiHandlers(db: DatabaseHandle) {
  return {
    status(ctx: RouteContext): void {
      const staleThreshold = Date.now() - STALE_THRESHOLD_MS;
      const purposes = ELIGIBLE_PURPOSES.map((p) => `'${p}'`).join(", ");
      const row = db
        .prepare(
          `SELECT COUNT(*) AS cnt FROM sessions
           WHERE distilled_at IS NULL
             AND head_message_id IS NOT NULL
             AND purpose IN (${purposes})
             AND (closed_at IS NOT NULL OR last_active_at < ?)`,
        )
        .get(staleThreshold) as { cnt: number };
      json(ctx, 200, { undistilledCount: row.cnt });
    },

    async sweep(ctx: RouteContext): Promise<void> {
      const model = resolveModel(db);
      try {
        const result = await distillPending(db, defaultChatFactory, model);
        json(ctx, 200, result);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        json(ctx, 500, { error: `Distillation failed: ${detail}` });
      }
    },

    async single(ctx: RouteContext): Promise<void> {
      const id = Number.parseInt(ctx.params.id ?? "", 10);
      if (Number.isNaN(id) || id <= 0) {
        json(ctx, 400, { error: "Invalid session ID." });
        return;
      }

      const model = resolveModel(db);
      try {
        const result = await distillSession(db, id, model, defaultChatFactory);
        json(ctx, 200, result);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        json(ctx, 500, { error: `Distillation failed: ${detail}` });
      }
    },
  };
}
