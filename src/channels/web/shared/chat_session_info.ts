export interface ChatSessionInfo {
  sessionId: number;
  model: string;
  totalTokens: number;
  createdAt: number;
  displayName: string | null;
}
