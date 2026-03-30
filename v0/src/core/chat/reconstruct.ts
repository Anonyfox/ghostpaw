import { Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";

interface JoinedRow {
  id: number;
  ordinal: number;
  role: "user" | "assistant" | "tool";
  content: string;
  tool_call_id: string | null;
  tc_id: string | null;
  tc_name: string | null;
  tc_args: string | null;
}

function rowsToMessages(rows: JoinedRow[]): Message[] {
  type GroupedMsg = {
    role: "user" | "assistant" | "tool";
    content: string;
    toolCallId: string | null;
    toolCalls: { id: string; name: string; arguments: string }[];
  };

  const grouped: GroupedMsg[] = [];
  let prev: GroupedMsg | null = null;
  let prevId = -1;

  for (const row of rows) {
    if (row.id !== prevId) {
      prev = {
        role: row.role,
        content: row.content,
        toolCallId: row.tool_call_id,
        toolCalls: [],
      };
      if (row.tc_id) {
        prev.toolCalls.push({ id: row.tc_id, name: row.tc_name!, arguments: row.tc_args ?? "{}" });
      }
      grouped.push(prev);
      prevId = row.id;
    } else if (row.tc_id && prev) {
      prev.toolCalls.push({ id: row.tc_id, name: row.tc_name!, arguments: row.tc_args ?? "{}" });
    }
  }

  return grouped.map((g) => {
    if (g.role === "user") return new Message("user", g.content);
    if (g.role === "tool") return new Message("tool", g.content, { toolCallId: g.toolCallId! });
    if (g.toolCalls.length > 0) {
      return new Message("assistant", g.content, { toolCalls: g.toolCalls });
    }
    return new Message("assistant", g.content);
  });
}

const JOIN_SELECT = `
  SELECT m.id, m.ordinal, m.role, m.content, m.tool_call_id,
         tc.id AS tc_id, tc.name AS tc_name, tc.arguments AS tc_args
  FROM messages m
  LEFT JOIN tool_calls tc ON tc.message_id = m.id`;

export function reconstructMessages(db: DatabaseHandle, sessionId: number): Message[] {
  const rows = db
    .prepare(`${JOIN_SELECT} WHERE m.session_id = ? ORDER BY m.ordinal, tc.id`)
    .all(sessionId) as unknown as JoinedRow[];
  return rowsToMessages(rows);
}

export function reconstructActiveHistory(db: DatabaseHandle, sessionId: number): Message[] {
  const sessionRow = db
    .prepare("SELECT head_message_id FROM sessions WHERE id = ?")
    .get(sessionId) as { head_message_id: number | null } | undefined;

  const headId = sessionRow?.head_message_id;
  if (!headId) {
    return reconstructMessages(db, sessionId);
  }

  const headRow = db.prepare("SELECT ordinal FROM messages WHERE id = ?").get(headId) as
    | { ordinal: number }
    | undefined;

  if (!headRow) {
    return reconstructMessages(db, sessionId);
  }

  const rows = db
    .prepare(`${JOIN_SELECT} WHERE m.session_id = ? AND m.ordinal >= ? ORDER BY m.ordinal, tc.id`)
    .all(sessionId, headRow.ordinal) as unknown as JoinedRow[];
  return rowsToMessages(rows);
}
