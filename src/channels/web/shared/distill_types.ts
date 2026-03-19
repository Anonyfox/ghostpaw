export interface DistillStatusResponse {
  undistilledCount: number;
}

export type DistillToolCallsInfo = Record<string, number>;

export interface DistillSweepResponse {
  sessionsProcessed: number;
  sessionsSkipped: number;
  totalToolCalls: DistillToolCallsInfo;
}
