export interface SpendStatus {
  spent: number;
  limit: number;
  remaining: number;
  percentage: number;
  isBlocked: boolean;
  windowMs: number;
}
