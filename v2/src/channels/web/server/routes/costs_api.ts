import { getConfig, setConfig } from "../../../../core/config/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type {
  CostsByModel,
  CostsByPurpose,
  CostsBySoul,
  CostsDailyEntry,
  CostsResponse,
  CostsTodaySummary,
} from "../../shared/cost_types.ts";
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

function dateMidnight(daysAgo: number): number {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
  return d.getTime();
}

export function createCostsApiHandlers(db: DatabaseHandle) {
  function queryTodaySummary(): CostsTodaySummary {
    const since = todayMidnight();
    const row = db
      .prepare(
        `SELECT
          COALESCE(SUM(cost_usd), 0)          AS costUsd,
          COALESCE(SUM(tokens_in), 0)          AS tokensIn,
          COALESCE(SUM(tokens_out), 0)         AS tokensOut,
          COALESCE(SUM(reasoning_tokens), 0)   AS reasoningTokens,
          COALESCE(SUM(cached_tokens), 0)      AS cachedTokens,
          COUNT(*)                              AS sessionCount
        FROM sessions WHERE last_active_at >= ? AND cost_usd > 0`,
      )
      .get(since) as unknown as CostsTodaySummary;
    return row;
  }

  function queryByModel(): CostsByModel[] {
    const since = todayMidnight();
    const sessionRows = db
      .prepare(
        `SELECT model,
          SUM(cost_usd) AS costUsd,
          SUM(tokens_in + tokens_out) AS tokens,
          COUNT(*) AS calls
        FROM sessions
        WHERE last_active_at >= ? AND cost_usd > 0 AND model IS NOT NULL
        GROUP BY model`,
      )
      .all(since) as unknown as CostsByModel[];

    const runRows = db
      .prepare(
        `SELECT model,
          SUM(cost_usd) AS costUsd,
          SUM(tokens_in + tokens_out) AS tokens,
          COUNT(*) AS calls
        FROM delegation_runs
        WHERE created_at >= ? AND cost_usd > 0 AND model IS NOT NULL
        GROUP BY model`,
      )
      .all(since) as unknown as CostsByModel[];

    const merged = new Map<string, CostsByModel>();
    for (const r of [...sessionRows, ...runRows]) {
      const existing = merged.get(r.model);
      if (existing) {
        existing.costUsd += r.costUsd;
        existing.tokens += r.tokens;
        existing.calls += r.calls;
      } else {
        merged.set(r.model, { ...r });
      }
    }

    return [...merged.values()].sort((a, b) => b.costUsd - a.costUsd);
  }

  function queryBySoul(): CostsBySoul[] {
    const since = todayMidnight();
    const rows = db
      .prepare(
        `SELECT specialist AS soul,
          SUM(cost_usd) AS costUsd,
          COUNT(*) AS runs
        FROM delegation_runs
        WHERE created_at >= ? AND cost_usd > 0
        GROUP BY specialist
        ORDER BY costUsd DESC`,
      )
      .all(since) as unknown as { soul: string; costUsd: number; runs: number }[];

    return rows.map((r) => ({
      soul: r.soul,
      costUsd: r.costUsd,
      runs: r.runs,
      avgCostUsd: r.runs > 0 ? r.costUsd / r.runs : 0,
    }));
  }

  function queryByPurpose(): CostsByPurpose[] {
    const since = todayMidnight();
    return db
      .prepare(
        `SELECT purpose,
          SUM(cost_usd) AS costUsd,
          COUNT(*) AS sessionCount
        FROM sessions
        WHERE last_active_at >= ? AND cost_usd > 0
        GROUP BY purpose
        ORDER BY costUsd DESC`,
      )
      .all(since) as unknown as CostsByPurpose[];
  }

  function queryDailyTrend(): CostsDailyEntry[] {
    const entries: CostsDailyEntry[] = [];

    for (let i = 0; i < 14; i++) {
      const dayStart = dateMidnight(i);
      const dayEnd = dateMidnight(i - 1);

      const row = db
        .prepare(
          `SELECT
            COALESCE(SUM(cost_usd), 0) AS costUsd,
            COALESCE(SUM(tokens_in + tokens_out), 0) AS tokens,
            COUNT(CASE WHEN cost_usd > 0 THEN 1 END) AS sessionCount
          FROM sessions
          WHERE last_active_at >= ? AND last_active_at < ?`,
        )
        .get(dayStart, dayEnd) as unknown as {
        costUsd: number;
        tokens: number;
        sessionCount: number;
      };

      const d = new Date(dayStart);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      entries.push({
        date,
        costUsd: row.costUsd,
        tokens: row.tokens,
        sessionCount: row.sessionCount,
      });
    }

    return entries;
  }

  return {
    get(ctx: RouteContext): void {
      const today = queryTodaySummary();
      const maxCostPerDay = (getConfig(db, "max_cost_per_day") as number | null) ?? 0;
      const warnAtPercentage = (getConfig(db, "warn_at_percentage") as number | null) ?? 80;

      const response: CostsResponse = {
        today,
        limit: { maxCostPerDay, warnAtPercentage },
        byModel: queryByModel(),
        bySoul: queryBySoul(),
        byPurpose: queryByPurpose(),
        daily: queryDailyTrend(),
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

      const todayCost = queryTodaySummary().costUsd;
      json(ctx, 200, {
        ok: true,
        maxCostPerDay: body.maxCostPerDay,
        todayCostUsd: todayCost,
      });
    },
  };
}
