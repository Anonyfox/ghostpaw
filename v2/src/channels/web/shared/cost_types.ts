export interface CostsTodaySummary {
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  reasoningTokens: number;
  cachedTokens: number;
  sessionCount: number;
}

export interface CostsLimitInfo {
  maxCostPerDay: number;
  warnAtPercentage: number;
}

export interface CostsByModel {
  model: string;
  costUsd: number;
  tokens: number;
  calls: number;
}

export interface CostsBySoul {
  soul: string;
  costUsd: number;
  runs: number;
  avgCostUsd: number;
}

export interface CostsByPurpose {
  purpose: string;
  costUsd: number;
  sessionCount: number;
}

export interface CostsDailyEntry {
  date: string;
  costUsd: number;
  tokens: number;
  sessionCount: number;
}

export interface CostsResponse {
  today: CostsTodaySummary;
  limit: CostsLimitInfo;
  byModel: CostsByModel[];
  bySoul: CostsBySoul[];
  byPurpose: CostsByPurpose[];
  daily: CostsDailyEntry[];
}
