import { Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { MessageRow, ToolCallRow } from "./types.ts";

export function reconstructMessages(db: DatabaseHandle, sessionId: number): Message[] {
  const rows = db
    .prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY ordinal")
    .all(sessionId) as unknown as MessageRow[];

  const messages: Message[] = [];

  for (const row of rows) {
    if (row.role === "user") {
      messages.push(new Message("user", row.content));
    } else if (row.role === "tool") {
      messages.push(new Message("tool", row.content, { toolCallId: row.tool_call_id! }));
    } else if (row.role === "assistant") {
      const toolCalls = db
        .prepare("SELECT * FROM tool_calls WHERE message_id = ?")
        .all(row.id) as unknown as ToolCallRow[];

      if (toolCalls.length > 0) {
        messages.push(
          new Message("assistant", row.content, {
            toolCalls: toolCalls.map((tc) => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments,
            })),
          }),
        );
      } else {
        messages.push(new Message("assistant", row.content));
      }
    }
  }

  return messages;
}
