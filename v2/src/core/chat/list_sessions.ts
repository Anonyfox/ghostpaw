import type { DatabaseHandle } from "../../lib/index.ts";
import type { ChatSession, ListSessionsFilter, SessionPurpose } from "./types.ts";

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
    reasoningTokens: (row.reasoning_tokens as number) ?? 0,
    cachedTokens: (row.cached_tokens as number) ?? 0,
    costUsd: (row.cost_usd as number) ?? 0,
    headMessageId: (row.head_message_id as number) ?? null,
    closedAt: (row.closed_at as number) ?? null,
    distilledAt: (row.distilled_at as number) ?? null,
    parentSessionId: (row.parent_session_id as number) ?? null,
  };
}

export function listSessions(db: DatabaseHandle, filter?: ListSessionsFilter): ChatSession[] {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter?.purpose) {
    clauses.push("purpose = ?");
    params.push(filter.purpose);
  }

  if (filter?.open === true) {
    clauses.push("closed_at IS NULL");
  } else if (filter?.open === false) {
    clauses.push("closed_at IS NOT NULL");
  }

  if (filter?.distilled === true) {
    clauses.push("distilled_at IS NOT NULL");
  } else if (filter?.distilled === false) {
    clauses.push("distilled_at IS NULL");
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const sql = `SELECT * FROM sessions ${where} ORDER BY last_active_at DESC`;

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(rowToSession);
}
