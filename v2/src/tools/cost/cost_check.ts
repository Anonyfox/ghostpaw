import { createTool } from "chatoyant";
import { getSpendInWindow } from "../../core/chat/api/read/index.ts";
import { getConfig } from "../../core/config/api/read/index.ts";
import { computeSpendStatus } from "../../lib/cost/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

const DAY_MS = 86_400_000;

export function createCostCheckTool(db: DatabaseHandle) {
  return createTool({
    name: "cost_check",
    description:
      "Check current spend against the daily dollar budget. Returns how much has been " +
      "spent today, the configured limit, remaining budget, percentage used, and whether " +
      "further spending is blocked. No parameters needed.",
    parameters: {},
    execute: async () => {
      const limit = (getConfig(db, "max_cost_per_day") as number | null) ?? 0;
      const spent = getSpendInWindow(db, DAY_MS);
      const status = computeSpendStatus(spent, limit, DAY_MS);
      return {
        spentUsd: Math.round(status.spent * 10000) / 10000,
        limitUsd: status.limit,
        remainingUsd: Math.round(status.remaining * 10000) / 10000,
        percentage: status.percentage,
        isBlocked: status.isBlocked,
        limitConfigured: limit > 0,
      };
    },
  });
}
