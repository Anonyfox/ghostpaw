export type RunStatus = "running" | "completed" | "failed";

export interface DelegationRun {
  id: number;
  parentSessionId: number;
  childSessionId: number | null;
  specialist: string;
  model: string;
  task: string;
  status: RunStatus;
  result: string | null;
  error: string | null;
  tokensIn: number;
  tokensOut: number;
  reasoningTokens: number;
  cachedTokens: number;
  costUsd: number;
  createdAt: number;
  completedAt: number | null;
}

export interface CreateRunInput {
  parentSessionId: number;
  specialist?: string;
  model: string;
  task: string;
}
