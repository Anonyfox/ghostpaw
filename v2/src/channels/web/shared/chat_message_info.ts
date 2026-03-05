export interface ChatMessageInfo {
  id: number;
  role: "user" | "assistant" | "tool_call" | "tool_result";
  content: string;
  createdAt: number;
}
