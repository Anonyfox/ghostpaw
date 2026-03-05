import { defineCommand } from "citty";
import { getConfig } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { style } from "../../lib/terminal/index.ts";
import costsSetLimit from "./costs_set_limit.ts";
import { withRunDb } from "./with_run_db.ts";

function todayMidnight(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function dateMidnight(daysAgo: number): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo).getTime();
}

function formatCost(usd: number): string {
  if (usd < 0.01) return usd > 0 ? usd.toFixed(4) : "0.00";
  return usd.toFixed(2);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

interface TodaySummary {
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  reasoningTokens: number;
  cachedTokens: number;
  sessionCount: number;
}

interface ByModel {
  model: string;
  costUsd: number;
  tokens: number;
  calls: number;
}

function queryToday(db: DatabaseHandle): TodaySummary {
  const since = todayMidnight();
  return db
    .prepare(
      `SELECT
        COALESCE(SUM(cost_usd), 0) AS costUsd,
        COALESCE(SUM(tokens_in), 0) AS tokensIn,
        COALESCE(SUM(tokens_out), 0) AS tokensOut,
        COALESCE(SUM(reasoning_tokens), 0) AS reasoningTokens,
        COALESCE(SUM(cached_tokens), 0) AS cachedTokens,
        COUNT(*) AS sessionCount
      FROM sessions WHERE last_active_at >= ? AND cost_usd > 0`,
    )
    .get(since) as unknown as TodaySummary;
}

function queryByModel(db: DatabaseHandle): ByModel[] {
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
    .all(since) as unknown as ByModel[];

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
    .all(since) as unknown as ByModel[];

  const merged = new Map<string, ByModel>();
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

function queryBySoul(db: DatabaseHandle): { soul: string; costUsd: number; runs: number }[] {
  const since = todayMidnight();
  return db
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
}

function queryByPurpose(
  db: DatabaseHandle,
): { purpose: string; costUsd: number; sessionCount: number }[] {
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
    .all(since) as unknown as { purpose: string; costUsd: number; sessionCount: number }[];
}

function queryDaily(
  db: DatabaseHandle,
  days: number,
): { date: string; costUsd: number; tokens: number; sessionCount: number }[] {
  const entries: { date: string; costUsd: number; tokens: number; sessionCount: number }[] = [];

  for (let i = 0; i < days; i++) {
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
    entries.push({ date, ...row });
  }

  return entries;
}

export default defineCommand({
  meta: { name: "costs", description: "View cost breakdown and daily limits" },
  args: {
    days: {
      type: "string",
      description: "Number of days for daily trend (default: 14)",
    },
  },
  subCommands: {
    "set-limit": costsSetLimit,
  },
  async run({ args }) {
    await withRunDb((db) => {
      const days = args.days ? Number.parseInt(args.days as string, 10) : 14;
      const today = queryToday(db);
      const maxCostPerDay = (getConfig(db, "max_cost_per_day") as number | null) ?? 0;
      const warnPct = (getConfig(db, "warn_at_percentage") as number | null) ?? 80;

      const pct = maxCostPerDay > 0 ? (today.costUsd / maxCostPerDay) * 100 : 0;
      const limitStr = maxCostPerDay > 0 ? `$${formatCost(maxCostPerDay)}` : "unlimited";
      let gaugeColor = style.green;
      if (maxCostPerDay > 0) {
        if (pct >= 100) gaugeColor = style.boldRed;
        else if (pct >= warnPct) gaugeColor = style.yellow;
      } else {
        gaugeColor = style.dim;
      }

      console.log(
        `${"today".padStart(10)}  ${gaugeColor(`$${formatCost(today.costUsd)}`)} of ${limitStr}${maxCostPerDay > 0 ? ` (${Math.round(pct)}%)` : ""}`,
      );
      console.log(
        `${"tokens".padStart(10)}  ${formatTokens(today.tokensIn)} in / ${formatTokens(today.tokensOut)} out / ${formatTokens(today.reasoningTokens)} reasoning / ${formatTokens(today.cachedTokens)} cached`,
      );

      const byModel = queryByModel(db);
      if (byModel.length > 0) {
        console.log();
        console.log(style.dim("── By Model ──"));
        const header = `  ${"Model".padEnd(28)} ${"Cost".padStart(9)} ${"Tokens".padStart(9)} ${"Calls".padStart(6)}`;
        console.log(style.dim(header));
        for (const m of byModel) {
          console.log(
            `  ${m.model.padEnd(28)} ${`$${formatCost(m.costUsd)}`.padStart(9)} ${formatTokens(m.tokens).padStart(9)} ${String(m.calls).padStart(6)}`,
          );
        }
      }

      const bySoul = queryBySoul(db);
      if (bySoul.length > 0) {
        console.log();
        console.log(style.dim("── By Soul ──"));
        const header = `  ${"Soul".padEnd(18)} ${"Cost".padStart(9)} ${"Runs".padStart(6)} ${"Avg".padStart(9)}`;
        console.log(style.dim(header));
        for (const s of bySoul) {
          const avg = s.runs > 0 ? s.costUsd / s.runs : 0;
          console.log(
            `  ${s.soul.padEnd(18)} ${`$${formatCost(s.costUsd)}`.padStart(9)} ${String(s.runs).padStart(6)} ${`$${formatCost(avg)}`.padStart(9)}`,
          );
        }
      }

      const byPurpose = queryByPurpose(db);
      if (byPurpose.length > 0) {
        console.log();
        console.log(style.dim("── By Purpose ──"));
        const header = `  ${"Purpose".padEnd(14)} ${"Cost".padStart(9)} ${"Sessions".padStart(9)}`;
        console.log(style.dim(header));
        for (const p of byPurpose) {
          console.log(
            `  ${p.purpose.padEnd(14)} ${`$${formatCost(p.costUsd)}`.padStart(9)} ${String(p.sessionCount).padStart(9)}`,
          );
        }
      }

      const daily = queryDaily(db, days);
      const hasData = daily.some((d) => d.costUsd > 0 || d.sessionCount > 0);
      if (hasData) {
        console.log();
        console.log(style.dim(`── Daily Trend (${days}d) ──`));
        const header = `  ${"Date".padEnd(12)} ${"Cost".padStart(9)} ${"Tokens".padStart(9)} ${"Sessions".padStart(9)}`;
        console.log(style.dim(header));
        for (const d of daily) {
          if (d.costUsd === 0 && d.sessionCount === 0) continue;
          console.log(
            `  ${d.date.padEnd(12)} ${`$${formatCost(d.costUsd)}`.padStart(9)} ${formatTokens(d.tokens).padStart(9)} ${String(d.sessionCount).padStart(9)}`,
          );
        }
      }
    });
  },
});
