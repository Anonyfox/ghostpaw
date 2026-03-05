import type { Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";

/**
 * Persists tool call/result messages from chatoyant's in-memory conversation
 * into the database message chain. Returns the final parentId so the caller
 * can chain the assistant message after all tool messages.
 *
 * Pass only the intermediate messages (exclude the final assistant text —
 * recordTurn handles that separately).
 */
export function persistToolMessages(
  db: DatabaseHandle,
  sessionId: number,
  turnMessages: readonly Message[],
  parentId: number | null,
): number | null {
  let currentParent = parentId;

  for (const msg of turnMessages) {
    if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
      const toolData = JSON.stringify(
        msg.toolCalls.map((tc) => ({ id: tc.id, name: tc.name, arguments: tc.arguments })),
      );
      const added = addMessage(db, {
        sessionId,
        role: "tool_call",
        content: msg.content || "",
        parentId: currentParent ?? undefined,
        toolData,
      });
      currentParent = added.id;
    } else if (msg.role === "tool") {
      const toolData = JSON.stringify({ toolCallId: msg.toolCallId ?? null });
      const added = addMessage(db, {
        sessionId,
        role: "tool_result",
        content: msg.content,
        parentId: currentParent ?? undefined,
        toolData,
      });
      currentParent = added.id;
    }
  }

  return currentParent;
}
