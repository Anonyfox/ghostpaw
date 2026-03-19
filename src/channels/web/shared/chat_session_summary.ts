export interface ChatSessionSummary {
  sessionId: number;
  displayName: string;
  model: string | null;
  totalTokens: number;
  lastActiveAt: number;
  channel: string;
}
