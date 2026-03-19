export interface ChatMessageInfo {
  id: number;
  role: "user" | "assistant" | "tool_call" | "tool_result" | "system";
  content: string;
  createdAt: number;
  replyToId: number | null;
}
