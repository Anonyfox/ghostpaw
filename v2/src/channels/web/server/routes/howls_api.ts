import { getHistory } from "../../../../core/chat/index.ts";
import {
  countPendingHowls,
  getHowl,
  listHowls,
  replyToHowl,
  updateHowlStatus,
} from "../../../../core/howl/index.ts";
import type { HowlStatus } from "../../../../core/howl/index.ts";
import type { Entity } from "../../../../harness/types.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

function parseQuery(url: string | undefined): URLSearchParams {
  if (!url) return new URLSearchParams();
  const idx = url.indexOf("?");
  if (idx < 0) return new URLSearchParams();
  return new URLSearchParams(url.slice(idx + 1));
}

export function createHowlsApiHandlers(db: DatabaseHandle, entity: Entity) {
  return {
    pending(ctx: RouteContext) {
      json(ctx, 200, { count: countPendingHowls(db) });
    },
    list(ctx: RouteContext) {
      const query = parseQuery(ctx.req.url);
      const status = query.get("status") as HowlStatus | null;
      const limit = Number(query.get("limit")) || 20;
      const howls = listHowls(db, { status: status ?? undefined, limit });
      json(ctx, 200, howls);
    },

    detail(ctx: RouteContext) {
      const id = Number(ctx.params?.id);
      if (!id || Number.isNaN(id)) {
        json(ctx, 400, { error: "Invalid howl ID" });
        return;
      }
      const howl = getHowl(db, id);
      if (!howl) {
        json(ctx, 404, { error: "Howl not found" });
        return;
      }
      json(ctx, 200, howl);
    },

    dismiss(ctx: RouteContext) {
      const id = Number(ctx.params?.id);
      if (!id || Number.isNaN(id)) {
        json(ctx, 400, { error: "Invalid howl ID" });
        return;
      }
      const howl = getHowl(db, id);
      if (!howl) {
        json(ctx, 404, { error: "Howl not found" });
        return;
      }
      updateHowlStatus(db, id, "dismissed");
      json(ctx, 200, { ok: true });
    },

    async reply(ctx: RouteContext) {
      const id = Number(ctx.params?.id);
      if (!id || Number.isNaN(id)) {
        json(ctx, 400, { error: "Invalid howl ID" });
        return;
      }
      let body: { message?: string };
      try {
        body = await readJsonBody<{ message?: string }>(ctx.req);
      } catch {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }
      const message = body?.message?.trim();
      if (!message) {
        json(ctx, 400, { error: "Message is required." });
        return;
      }
      try {
        const result = await replyToHowl(db, entity, id, message, {
          replyChannel: "web",
        });
        json(ctx, 200, {
          howlId: result.howlId,
          content: result.turn.content,
          succeeded: result.turn.succeeded,
          usage: result.turn.usage,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        json(ctx, 400, { error: msg });
      }
    },

    history(ctx: RouteContext) {
      const id = Number(ctx.params?.id);
      if (!id || Number.isNaN(id)) {
        json(ctx, 400, { error: "Invalid howl ID" });
        return;
      }
      const howl = getHowl(db, id);
      if (!howl) {
        json(ctx, 404, { error: "Howl not found" });
        return;
      }
      const messages = getHistory(db, howl.sessionId).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }));
      json(ctx, 200, { howl, messages });
    },
  };
}
