import { defineCommand } from "citty";
import {
  getCostByModel,
  getCostByPurpose,
  getCostBySoul,
  getCostSummary,
  getDailyCostTrend,
} from "../../core/chat/api/read/index.ts";
import { getConfig } from "../../core/config/api/read/index.ts";
import { style } from "../../lib/terminal/index.ts";
import costsSetLimit from "./costs_set_limit.ts";
import { withRunDb } from "./with_run_db.ts";

function todayMidnight(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
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
      const since = todayMidnight();
      const today = getCostSummary(db, since);
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

      const byModel = getCostByModel(db, since);
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

      const bySoul = getCostBySoul(db, since);
      if (bySoul.length > 0) {
        console.log();
        console.log(style.dim("── By Soul ──"));
        const header = `  ${"Soul".padEnd(18)} ${"Cost".padStart(9)} ${"Runs".padStart(6)} ${"Avg".padStart(9)}`;
        console.log(style.dim(header));
        for (const s of bySoul) {
          console.log(
            `  ${s.soul.padEnd(18)} ${`$${formatCost(s.costUsd)}`.padStart(9)} ${String(s.runs).padStart(6)} ${`$${formatCost(s.avgCostUsd)}`.padStart(9)}`,
          );
        }
      }

      const byPurpose = getCostByPurpose(db, since);
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

      const daily = getDailyCostTrend(db, days);
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
