import type { Tool } from "chatoyant";
import type { ChatFactory, ChatInstance } from "./chat_instance.ts";
import type { ChatMessage } from "./types.ts";

export function buildChat(
  history: ChatMessage[],
  systemPrompt: string,
  model: string,
  tools: Tool[],
  createChat: ChatFactory,
): ChatInstance {
  const chat = createChat(model);
  chat.system(systemPrompt);

  for (const msg of history) {
    if (msg.role === "user") chat.user(msg.content);
    else if (msg.role === "assistant") chat.assistant(msg.content);
  }

  for (const tool of tools) {
    chat.addTool(tool);
  }

  return chat;
}
