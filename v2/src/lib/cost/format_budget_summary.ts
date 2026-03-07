import type { BudgetNumbers } from "./types.ts";

function pct(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatBudgetSummary(nums: BudgetNumbers): string | null {
  const sessionPct = pct(nums.sessionTokens, nums.sessionLimit);
  const dayPct = pct(nums.dayTokens, nums.dayLimit);
  const threshold = nums.warnAtPercentage;

  const sessionWarning = nums.sessionLimit > 0 && sessionPct >= threshold;
  const dayWarning = nums.dayLimit > 0 && dayPct >= threshold;

  if (!sessionWarning && !dayWarning) return null;

  const lines: string[] = [];
  if (nums.sessionLimit > 0) {
    lines.push(
      `Session: ${fmt(nums.sessionTokens)} / ${fmt(nums.sessionLimit)} tokens (${sessionPct}%)`,
    );
  }
  if (nums.dayLimit > 0) {
    lines.push(`Day: ${fmt(nums.dayTokens)} / ${fmt(nums.dayLimit)} tokens (${dayPct}%)`);
  }
  return lines.join("\n");
}
