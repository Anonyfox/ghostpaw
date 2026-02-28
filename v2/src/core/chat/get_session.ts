import type { DatabaseHandle } from "../../lib/index.ts";
import { isNullRow } from "../../lib/index.ts";
import type { ChatSession, SessionPurpose } from "./types.ts";

function rowToSession(row: Record<string, unknown>): ChatSession {
  return {
    id: row.id as number,
    key: row.key as string,
    purpose: (row.purpose as SessionPurpose) ?? "chat",
    model: (row.model as string) ?? null,
    displayName: (row.display_name as string) ?? null,
    createdAt: row.created_at as number,
    lastActiveAt: row.last_active_at as number,
    tokensIn: (row.tokens_in as number) ?? 0,
    tokensOut: (row.tokens_out as number) ?? 0,
    costUsd: (row.cost_usd as number) ?? 0,
    headMessageId: (row.head_message_id as number) ?? null,
    closedAt: (row.closed_at as number) ?? null,
    absorbedAt: (row.absorbed_at as number) ?? null,
  };
}

export function getSession(db: DatabaseHandle, id: number): ChatSession | null {
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return isNullRow(row) ? null : rowToSession(row);
}
