import type { DatabaseHandle } from "../../lib/index.ts";
import type { MessageRole } from "./types.ts";

export function getSessionMessage(
  db: DatabaseHandle,
  sessionId: number,
  role: MessageRole,
  order: "first" | "last",
): string | null {
  const direction = order === "first" ? "ASC" : "DESC";
  const row = db
    .prepare(
      `SELECT content FROM messages WHERE session_id = ? AND role = ? ORDER BY id ${direction} LIMIT 1`,
    )
    .get(sessionId, role) as { content: string } | undefined;
  return row?.content ?? null;
}
