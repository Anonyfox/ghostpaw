export interface CostSummary {
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  reasoningTokens: number;
  cachedTokens: number;
  sessionCount: number;
}

export interface CostByModel {
  model: string;
  costUsd: number;
  tokens: number;
  calls: number;
}

export interface CostBySoul {
  soul: string;
  costUsd: number;
  runs: number;
  avgCostUsd: number;
}

export interface CostByPurpose {
  purpose: string;
  costUsd: number;
  sessionCount: number;
}

export interface DailyCostEntry {
  date: string;
  costUsd: number;
  tokens: number;
  sessionCount: number;
}
