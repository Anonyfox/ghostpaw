import type { ChatFactory } from "../../core/chat/index.ts";

export const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful AI assistant. Respond concisely, accurately, and directly.";

export interface RunInput {
  prompt: string;
  model?: string;
  systemPrompt?: string;
  createChat: ChatFactory;
}

export interface RunResult {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  totalTokens: number;
}
