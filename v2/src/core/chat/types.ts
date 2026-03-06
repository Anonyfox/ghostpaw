export const SESSION_PURPOSES = ["chat", "delegate", "train", "scout", "system", "haunt", "howl"] as const;
export type SessionPurpose = (typeof SESSION_PURPOSES)[number];

export const MESSAGE_ROLES = ["user", "assistant", "tool_call", "tool_result"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export interface ChatSession {
  id: number;
  key: string;
  purpose: SessionPurpose;
  model: string | null;
  displayName: string | null;
  createdAt: number;
  lastActiveAt: number;
  tokensIn: number;
  tokensOut: number;
  reasoningTokens: number;
  cachedTokens: number;
  costUsd: number;
  headMessageId: number | null;
  closedAt: number | null;
  distilledAt: number | null;
  parentSessionId: number | null;
}

export interface ChatMessage {
  id: number;
  sessionId: number;
  parentId: number | null;
  role: MessageRole;
  content: string;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  reasoningTokens: number;
  cachedTokens: number;
  costUsd: number;
  createdAt: number;
  isCompaction: boolean;
  toolData: string | null;
}

export interface CreateSessionInput {
  purpose?: SessionPurpose;
  model?: string;
  parentSessionId?: number;
}

export interface AddMessageInput {
  sessionId: number;
  role: MessageRole;
  content: string;
  parentId?: number;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  reasoningTokens?: number;
  cachedTokens?: number;
  costUsd?: number;
  isCompaction?: boolean;
  toolData?: string;
}

export interface ListSessionsFilter {
  purpose?: SessionPurpose;
  open?: boolean;
  distilled?: boolean;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  args: unknown;
}

export interface ToolResultInfo {
  id: string;
  success: boolean;
  error?: string;
}

export interface TurnInput {
  sessionId: number;
  content: string;
  systemPrompt: string;
  model: string;
  maxIterations?: number;
  toolTimeout?: number;
  temperature?: number;
  maxTokens?: number;
  reasoning?: "off" | "low" | "medium" | "high";
  compactionThreshold?: number;
  abortSignal?: AbortSignal;
  onToolCallStart?: (calls: ToolCallInfo[]) => void;
  onToolCallComplete?: (results: ToolResultInfo[]) => void;
}

export interface TurnResult {
  succeeded: boolean;
  messageId: number;
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cachedTokens: number;
    totalTokens: number;
  };
  cost: { estimatedUsd: number };
  iterations: number;
}
