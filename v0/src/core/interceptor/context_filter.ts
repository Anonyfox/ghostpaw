import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { MessageRow } from "../chat/types.ts";

const SUBSYSTEM_PREFIX = "subsystem_";

interface JoinedRow {
  id: number;
  session_id: number;
  ordinal: number;
  role: "user" | "assistant" | "tool";
  content: string;
  source: string;
  tool_call_id: string | null;
  tc_id: string | null;
  tc_name: string | null;
}

/**
 * Filters the parent session's message history for a specific subsystem's
 * child session context. Returns the last N turn-pairs, keeping:
 * - User messages (always)
 * - Organic assistant responses (always)
 * - This subsystem's own synthetic tool call/result pairs
 * Strips:
 * - Other subsystems' synthetic entries
 * - Organic tool calls and their results (file reads, bash, etc.)
 */
export function filterContextForSubsystem(
  db: DatabaseHandle,
  sessionId: number,
  subsystemName: string,
  lookback: number,
): MessageRow[] {
  const joinedRows = db
    .prepare(
      `SELECT m.id, m.session_id, m.ordinal, m.role, m.content, m.source, m.tool_call_id,
              tc.id AS tc_id, tc.name AS tc_name
       FROM messages m
       LEFT JOIN tool_calls tc ON tc.message_id = m.id
       WHERE m.session_id = ?
       ORDER BY m.ordinal, tc.id`,
    )
    .all(sessionId) as unknown as JoinedRow[];

  const syntheticToolName = `${SUBSYSTEM_PREFIX}${subsystemName}`;

  type MsgGroup = {
    row: MessageRow;
    tcEntries: { id: string; name: string }[];
  };

  const groups: MsgGroup[] = [];
  let current: MsgGroup | null = null;
  let currentId = -1;

  for (const jr of joinedRows) {
    if (jr.id !== currentId) {
      current = {
        row: {
          id: jr.id,
          session_id: jr.session_id,
          ordinal: jr.ordinal,
          role: jr.role,
          content: jr.content,
          source: jr.source as "organic" | "synthetic",
          tool_call_id: jr.tool_call_id,
          model: null,
          input_tokens: null,
          output_tokens: null,
          cached_tokens: null,
          reasoning_tokens: null,
          cost_usd: null,
          created_at: "",
        },
        tcEntries: [],
      };
      if (jr.tc_id && jr.tc_name) current.tcEntries.push({ id: jr.tc_id, name: jr.tc_name });
      groups.push(current);
      currentId = jr.id;
    } else if (jr.tc_id && jr.tc_name && current) {
      current.tcEntries.push({ id: jr.tc_id, name: jr.tc_name });
    }
  }

  const filtered: MessageRow[] = [];
  const syntheticCallIds = new Set<string>();

  for (const g of groups) {
    const { row, tcEntries } = g;

    if (row.role === "user") {
      filtered.push(row);
      continue;
    }

    if (row.role === "assistant") {
      if (tcEntries.length === 0) {
        filtered.push(row);
        continue;
      }

      const hasSyntheticCalls = tcEntries.some((tc) => tc.name.startsWith(SUBSYSTEM_PREFIX));
      if (hasSyntheticCalls) {
        const ownCalls = tcEntries.filter((tc) => tc.name === syntheticToolName);
        if (ownCalls.length > 0) {
          filtered.push(row);
          for (const tc of ownCalls) syntheticCallIds.add(tc.id);
        }
      } else {
        filtered.push(row);
      }
      continue;
    }

    if (row.role === "tool") {
      if (row.tool_call_id && syntheticCallIds.has(row.tool_call_id)) {
        filtered.push(row);
      }
    }
  }

  if (lookback <= 0) return filtered;

  const userIndices: number[] = [];
  for (let i = 0; i < filtered.length; i++) {
    if (filtered[i].role === "user") userIndices.push(i);
  }

  if (userIndices.length <= lookback) return filtered;

  const cutoffIndex = userIndices[userIndices.length - lookback];
  return filtered.slice(cutoffIndex);
}
