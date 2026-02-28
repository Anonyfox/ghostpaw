export interface ChatMessageInfo {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}
