export const SESSION_PURPOSES = ["chat", "delegate", "train", "scout", "refine", "system"] as const;
export type SessionPurpose = (typeof SESSION_PURPOSES)[number];

export const MESSAGE_ROLES = ["user", "assistant"] as const;
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
  costUsd: number;
  headMessageId: number | null;
  closedAt: number | null;
  absorbedAt: number | null;
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
  costUsd: number;
  createdAt: number;
  isCompaction: boolean;
}

export interface CreateSessionInput {
  purpose?: SessionPurpose;
  model?: string;
}

export interface AddMessageInput {
  sessionId: number;
  role: MessageRole;
  content: string;
  parentId?: number;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  isCompaction?: boolean;
}

export interface ListSessionsFilter {
  purpose?: SessionPurpose;
  open?: boolean;
  absorbed?: boolean;
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
}

export interface TurnResult {
  messageId: number;
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    totalTokens: number;
  };
  cost: { estimatedUsd: number };
  iterations: number;
}
