export type SessionPurpose = "chat" | "ghost" | "subsystem_turn" | "system" | "pulse" | "shade";
export type MessageSource = "organic" | "synthetic";

export interface Session {
  id: number;
  title: string | null;
  model: string;
  system_prompt: string;
  purpose: SessionPurpose;
  parent_session_id: number | null;
  triggered_by_message_id: number | null;
  head_message_id: number | null;
  soul_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: number;
  session_id: number;
  ordinal: number;
  role: "user" | "assistant" | "tool";
  content: string;
  source: MessageSource;
  tool_call_id: string | null;
  parent_id: number | null;
  is_compaction: number;
  sealed_at: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cached_tokens: number | null;
  reasoning_tokens: number | null;
  cost_usd: number | null;
  created_at: string;
}

export interface ToolCallRow {
  id: string;
  message_id: number;
  name: string;
  arguments: string;
}

export interface TurnOptions {
  model?: string;
  maxIterations?: number;
  temperature?: number;
  reasoning?: "off" | "low" | "medium" | "high";
  ghost?: boolean;
  onToolCallStart?: (calls: ToolCallInfo[]) => void;
  onToolCallComplete?: (results: ToolResultInfo[]) => void;
}

export interface ToolCallInfo {
  id: string;
  name: string;
}

export interface ToolResultInfo {
  callId: string;
  name: string;
  success: boolean;
}

export interface TurnResult {
  succeeded: boolean;
  sessionId: number;
  messageId: number;
  userMessageId: number;
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

export interface Agent {
  streamTurn(
    sessionId: number,
    content: string,
    options?: TurnOptions,
  ): AsyncGenerator<string, TurnResult>;

  executeTurn(sessionId: number, content: string, options?: TurnOptions): Promise<TurnResult>;
}
