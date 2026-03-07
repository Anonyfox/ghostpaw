import { createTool, Schema } from "chatoyant";
import {
  getCostByModel,
  getCostByPurpose,
  getCostBySoul,
  getCostSummary,
  getDailyCostTrend,
} from "../../core/chat/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class CostSummaryParams extends Schema {
  days = Schema.Integer({
    description:
      "Number of days to cover. 1 = today only, 7 = last week, 30 = last month. " +
      "Default: 1. The summary always starts from midnight of the earliest day.",
    optional: true,
  });
}

function midnightDaysAgo(days: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d.getTime();
}

export function createCostSummaryTool(db: DatabaseHandle) {
  return createTool({
    name: "cost_summary",
    description:
      "Review spending across a time window. Returns total cost and token counts, plus " +
      "breakdowns by model, by soul, and by purpose (chat, delegation, haunt, etc). " +
      "When days > 1, also includes a daily trend. Use this to understand where budget " +
      "is going and which models or souls are most expensive.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new CostSummaryParams() as any,
    execute: async ({ args }) => {
      const { days: rawDays } = args as { days?: number };
      const days = Math.max(rawDays ?? 1, 1);
      const sinceMs = midnightDaysAgo(days);

      const summary = getCostSummary(db, sinceMs);
      const byModel = getCostByModel(db, sinceMs);
      const bySoul = getCostBySoul(db, sinceMs);
      const byPurpose = getCostByPurpose(db, sinceMs);

      const result: Record<string, unknown> = {
        days,
        totals: {
          costUsd: Math.round(summary.costUsd * 10000) / 10000,
          tokensIn: summary.tokensIn,
          tokensOut: summary.tokensOut,
          reasoningTokens: summary.reasoningTokens,
          cachedTokens: summary.cachedTokens,
          sessions: summary.sessionCount,
        },
        byModel: byModel.map((m) => ({
          model: m.model,
          costUsd: Math.round(m.costUsd * 10000) / 10000,
          tokens: m.tokens,
          calls: m.calls,
        })),
        bySoul: bySoul.map((s) => ({
          soul: s.soul,
          costUsd: Math.round(s.costUsd * 10000) / 10000,
          runs: s.runs,
          avgCostUsd: Math.round(s.avgCostUsd * 10000) / 10000,
        })),
        byPurpose: byPurpose.map((p) => ({
          purpose: p.purpose,
          costUsd: Math.round(p.costUsd * 10000) / 10000,
          sessions: p.sessionCount,
        })),
      };

      if (days > 1) {
        result.dailyTrend = getDailyCostTrend(db, days).map((d) => ({
          date: d.date,
          costUsd: Math.round(d.costUsd * 10000) / 10000,
          tokens: d.tokens,
          sessions: d.sessionCount,
        }));
      }

      return result;
    },
  });
}
