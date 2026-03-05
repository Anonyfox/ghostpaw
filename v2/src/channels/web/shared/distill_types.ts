export interface DistillStatusResponse {
  undistilledCount: number;
}

export interface DistillToolCallsInfo {
  recall: number;
  remember: number;
  revise: number;
  forget: number;
}

export interface DistillSweepResponse {
  sessionsProcessed: number;
  sessionsSkipped: number;
  totalToolCalls: DistillToolCallsInfo;
}
