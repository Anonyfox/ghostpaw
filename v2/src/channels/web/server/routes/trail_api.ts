import {
  getAllCalibration,
  getCompiledPreamble,
  getPairHistorySummary,
  getQuestContextHints,
  getTrailState,
  listChronicleEntries,
  listOmens,
  listOpenLoops,
  listPairingWisdom,
} from "../../../../core/trail/api/read/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

function parseQuery(url?: string): URLSearchParams {
  if (!url) return new URLSearchParams();
  const idx = url.indexOf("?");
  return idx >= 0 ? new URLSearchParams(url.slice(idx + 1)) : new URLSearchParams();
}

// Trail data is optional — handlers return empty state on errors so the UI
// renders "no data yet" rather than a broken page. Trail tables may not exist
// until the first sweep runs.
export function createTrailApiHandlers(db: DatabaseHandle) {
  return {
    state(ctx: RouteContext): void {
      try {
        const trail = getTrailState(db);
        const preamble = getCompiledPreamble(db);
        const topLoops = listOpenLoops(db, { status: "alive", limit: 2 });
        json(ctx, 200, {
          chapter: trail.chapter,
          momentum: trail.momentum,
          recentTrailmarks: trail.recentTrailmarks,
          preamble: preamble?.text ?? null,
          topLoops: topLoops.map((l) => ({
            id: l.id,
            description: l.description,
            significance: l.significance,
            status: l.status,
            recommendedAction: l.recommendedAction,
            createdAt: l.createdAt,
            updatedAt: l.updatedAt,
          })),
        });
      } catch {
        json(ctx, 200, {
          chapter: null,
          momentum: "stable",
          recentTrailmarks: [],
          preamble: null,
          topLoops: [],
        });
      }
    },

    chronicle(ctx: RouteContext): void {
      const qs = parseQuery(ctx.req.url);
      const limit = Math.min(50, Math.max(1, Number(qs.get("limit")) || 10));
      const beforeId = qs.get("beforeId") ? Number(qs.get("beforeId")) : undefined;
      try {
        const entries = listChronicleEntries(db, { limit, beforeId });
        json(ctx, 200, { entries });
      } catch {
        json(ctx, 200, { entries: [] });
      }
    },

    wisdom(ctx: RouteContext): void {
      const qs = parseQuery(ctx.req.url);
      const category = qs.get("category") || undefined;
      const limit = Math.min(100, Math.max(1, Number(qs.get("limit")) || 50));
      try {
        const entries = listPairingWisdom(db, {
          category: category as
            | "tone"
            | "framing"
            | "timing"
            | "initiative"
            | "workflow"
            | "boundaries"
            | "operational"
            | "other"
            | undefined,
          limit,
        });
        json(ctx, 200, { entries });
      } catch {
        json(ctx, 200, { entries: [] });
      }
    },

    loops(ctx: RouteContext): void {
      const qs = parseQuery(ctx.req.url);
      const status = (qs.get("status") || "alive") as
        | "alive"
        | "dormant"
        | "resolved"
        | "dismissed";
      const limit = Math.min(50, Math.max(1, Number(qs.get("limit")) || 20));
      try {
        const loops = listOpenLoops(db, { status, limit });
        json(ctx, 200, {
          loops: loops.map((l) => ({
            id: l.id,
            description: l.description,
            significance: l.significance,
            status: l.status,
            recommendedAction: l.recommendedAction,
            createdAt: l.createdAt,
            updatedAt: l.updatedAt,
          })),
        });
      } catch {
        json(ctx, 200, { loops: [] });
      }
    },

    omens(ctx: RouteContext): void {
      const qs = parseQuery(ctx.req.url);
      const includeResolved = qs.get("includeResolved") === "true";
      try {
        const omens = listOmens(db, { includeResolved });
        json(ctx, 200, { omens });
      } catch {
        json(ctx, 200, { omens: [] });
      }
    },

    calibration(ctx: RouteContext): void {
      try {
        const entries = getAllCalibration(db);
        json(ctx, 200, { entries });
      } catch {
        json(ctx, 200, { entries: [] });
      }
    },

    pairSummary(ctx: RouteContext): void {
      try {
        json(ctx, 200, getPairHistorySummary(db));
      } catch {
        json(ctx, 200, {
          chapter: null,
          momentum: "stable",
          latestChronicle: null,
          topWisdom: [],
          activeLoopCount: 0,
        });
      }
    },

    curiosity(ctx: RouteContext): void {
      try {
        const loops = listOpenLoops(db, { category: "curiosity", status: "alive", limit: 20 });
        json(ctx, 200, {
          questions: loops.map((l) => ({
            id: l.id,
            question: l.description,
            significance: l.significance,
            recommendedAction: l.recommendedAction,
            createdAt: l.createdAt,
          })),
        });
      } catch {
        json(ctx, 200, { questions: [] });
      }
    },

    questHints(ctx: RouteContext): void {
      const qs = parseQuery(ctx.req.url);
      const questId = Number(qs.get("questId"));
      if (!questId || questId < 1) {
        json(ctx, 400, { error: "questId query parameter is required." });
        return;
      }
      try {
        json(ctx, 200, getQuestContextHints(db, questId));
      } catch {
        json(ctx, 200, { chapter: null, linkedLoops: [] });
      }
    },
  };
}
