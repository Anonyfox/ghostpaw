export interface SpendStatus {
  spent: number;
  limit: number;
  remaining: number;
  percentage: number;
  isBlocked: boolean;
  windowMs: number;
}

export interface BudgetNumbers {
  sessionTokens: number;
  sessionLimit: number;
  dayTokens: number;
  dayLimit: number;
  warnAtPercentage: number;
}
