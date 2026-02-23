import { BudgetExceededError } from "../lib/errors.js";
import type { CostControls } from "./config.js";

/**
 * Approximate token count using the ~4 characters per token heuristic.
 * This is intentionally fast and imprecise — real counts come from provider
 * usage data. Used only for pre-flight estimates and context window math.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export interface TokenUsage {
  sessionTokensIn: number;
  sessionTokensOut: number;
  sessionTotal: number;
  sessionPercentage: number;
  dayTokensIn: number;
  dayTokensOut: number;
  dayTotal: number;
  dayPercentage: number;
  isWarning: boolean;
  isExceeded: boolean;
}

export interface BudgetTracker {
  record(tokensIn: number, tokensOut: number): void;
  getUsage(): TokenUsage;
  checkBudget(): void;
  resetSession(): void;
  formatSummary(): string;
}

export function createBudgetTracker(controls: CostControls): BudgetTracker {
  let sessionIn = 0;
  let sessionOut = 0;
  let dayIn = 0;
  let dayOut = 0;

  function getUsage(): TokenUsage {
    const sessionTotal = sessionIn + sessionOut;
    const dayTotal = dayIn + dayOut;
    const sessionPercentage =
      controls.maxTokensPerSession > 0
        ? Math.round((sessionTotal / controls.maxTokensPerSession) * 100)
        : 0;
    const dayPercentage =
      controls.maxTokensPerDay > 0 ? Math.round((dayTotal / controls.maxTokensPerDay) * 100) : 0;

    return {
      sessionTokensIn: sessionIn,
      sessionTokensOut: sessionOut,
      sessionTotal,
      sessionPercentage,
      dayTokensIn: dayIn,
      dayTokensOut: dayOut,
      dayTotal,
      dayPercentage,
      isWarning:
        sessionPercentage >= controls.warnAtPercentage ||
        dayPercentage >= controls.warnAtPercentage,
      isExceeded:
        sessionTotal > controls.maxTokensPerSession || dayTotal > controls.maxTokensPerDay,
    };
  }

  return {
    record(tokensIn: number, tokensOut: number) {
      sessionIn += tokensIn;
      sessionOut += tokensOut;
      dayIn += tokensIn;
      dayOut += tokensOut;
    },

    getUsage,

    checkBudget() {
      const usage = getUsage();
      if (usage.sessionTotal > controls.maxTokensPerSession) {
        throw new BudgetExceededError(usage.sessionTotal, controls.maxTokensPerSession);
      }
      if (usage.dayTotal > controls.maxTokensPerDay) {
        throw new BudgetExceededError(usage.dayTotal, controls.maxTokensPerDay);
      }
    },

    resetSession() {
      sessionIn = 0;
      sessionOut = 0;
    },

    formatSummary(): string {
      const u = getUsage();
      return [
        `Session: ${u.sessionTokensIn} in + ${u.sessionTokensOut} out = ${u.sessionTotal} / ${controls.maxTokensPerSession} (${u.sessionPercentage}%)`,
        `Day:     ${u.dayTokensIn} in + ${u.dayTokensOut} out = ${u.dayTotal} / ${controls.maxTokensPerDay} (${u.dayPercentage}%)`,
      ].join("\n");
    },
  };
}
