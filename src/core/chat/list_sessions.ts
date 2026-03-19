import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToSession } from "./row_to_session.ts";
import type { ChatSession, ListSessionsFilter } from "./types.ts";

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

  if (filter?.parentSessionId != null) {
    clauses.push("parent_session_id = ?");
    params.push(filter.parentSessionId);
  }

  if (filter?.soulId != null) {
    clauses.push("soul_id = ?");
    params.push(filter.soulId);
  }

  if (filter?.keyPrefix) {
    clauses.push("key LIKE ?");
    params.push(`${filter.keyPrefix}%`);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const limitClause = filter?.limit != null ? `LIMIT ${filter.limit}` : "";
  const sql = `SELECT * FROM sessions ${where} ORDER BY last_active_at DESC ${limitClause}`;

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(rowToSession);
}
