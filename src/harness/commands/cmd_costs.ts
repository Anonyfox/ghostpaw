import { getCostSummary } from "../../core/chat/api/read/index.ts";
import type { CommandContext, CommandResult } from "./types.ts";

const MS_PER_DAY = 86_400_000;

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export async function executeCosts(ctx: CommandContext, _args: string): Promise<CommandResult> {
  const now = Date.now();
  const todayCutoff = now - MS_PER_DAY;
  const weekCutoff = now - 7 * MS_PER_DAY;

  const today = getCostSummary(ctx.db, todayCutoff);
  const week = getCostSummary(ctx.db, weekCutoff);
  const total = getCostSummary(ctx.db, 0);

  const lines = [
    `Today: ${formatUsd(today.costUsd)} (${today.sessionCount} sessions)`,
    `This week: ${formatUsd(week.costUsd)} (${week.sessionCount} sessions)`,
    `All time: ${formatUsd(total.costUsd)} (${total.sessionCount} sessions)`,
  ];

  return { text: lines.join("\n") };
}
