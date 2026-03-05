export type SessionStatus = "open" | "closed" | "distilled";

export interface SessionInfo {
  id: number;
  key: string;
  channel: string;
  purpose: string;
  status: SessionStatus;
  displayName: string;
  preview: string;
  model: string | null;
  createdAt: number;
  lastActiveAt: number;
  tokensIn: number;
  tokensOut: number;
  reasoningTokens: number;
  cachedTokens: number;
  costUsd: number;
  messageCount: number;
  parentSessionId: number | null;
  delegationCount: number;
}

export interface SessionStatsResponse {
  total: number;
  open: number;
  closed: number;
  distilled: number;
  byChannel: Record<string, number>;
  byPurpose: Record<string, number>;
}

export interface SessionListResponse {
  sessions: SessionInfo[];
  total: number;
}

export interface SessionMessageInfo {
  id: number;
  role: "user" | "assistant" | "tool_call" | "tool_result";
  content: string;
  model: string | null;
  createdAt: number;
  isCompaction: boolean;
  toolData: string | null;
  costUsd: number;
  tokensOut: number;
}

export interface SessionRunInfo {
  id: number;
  specialist: string;
  model: string;
  task: string;
  status: "running" | "completed" | "failed";
  result: string | null;
  error: string | null;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  createdAt: number;
  completedAt: number | null;
  childSessionId: number | null;
}

export interface SessionDetailResponse {
  session: SessionInfo;
  messages: SessionMessageInfo[];
  runs: SessionRunInfo[];
  parentSession: { id: number; displayName: string } | null;
}
