import {
  getCostByModel,
  getCostByPurpose,
  getCostBySoul,
  getCostSummary,
  getDailyCostTrend,
} from "../../../../core/chat/index.ts";
import { getConfig, setConfig } from "../../../../core/config/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { CostsResponse } from "../../shared/cost_types.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

function todayMidnight(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function createCostsApiHandlers(db: DatabaseHandle) {
  return {
    get(ctx: RouteContext): void {
      const since = todayMidnight();
      const today = getCostSummary(db, since);
      const maxCostPerDay = (getConfig(db, "max_cost_per_day") as number | null) ?? 0;
      const warnAtPercentage = (getConfig(db, "warn_at_percentage") as number | null) ?? 80;

      const response: CostsResponse = {
        today,
        limit: { maxCostPerDay, warnAtPercentage },
        byModel: getCostByModel(db, since),
        bySoul: getCostBySoul(db, since),
        byPurpose: getCostByPurpose(db, since),
        daily: getDailyCostTrend(db, 14),
      };

      json(ctx, 200, response);
    },

    async setLimit(ctx: RouteContext): Promise<void> {
      const body = await readJsonBody<{ maxCostPerDay?: unknown }>(ctx.req);
      if (!body || typeof body.maxCostPerDay !== "number" || body.maxCostPerDay < 0) {
        json(ctx, 400, { error: "maxCostPerDay must be a non-negative number." });
        return;
      }

      setConfig(db, "max_cost_per_day", body.maxCostPerDay, "web");

      const todayCost = getCostSummary(db, todayMidnight()).costUsd;
      json(ctx, 200, {
        ok: true,
        maxCostPerDay: body.maxCostPerDay,
        todayCostUsd: todayCost,
      });
    },
  };
}
