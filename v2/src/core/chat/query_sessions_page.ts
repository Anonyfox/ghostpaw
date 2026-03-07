import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToSession } from "./row_to_session.ts";
import type { ChatSession, SessionPurpose } from "./types.ts";

export interface QuerySessionsFilter {
  channel?: string;
  purpose?: SessionPurpose;
  status?: "open" | "closed" | "distilled";
  search?: string;
  parentSessionId?: number;
  soulId?: number;
}

export type SessionSort = "recent" | "oldest" | "expensive" | "tokens";

export interface QuerySessionsOptions {
  filter?: QuerySessionsFilter;
  sort?: SessionSort;
  limit?: number;
  offset?: number;
}

export interface SessionWithCounts extends ChatSession {
  messageCount: number;
  delegationCount: number;
}

export interface QuerySessionsResult {
  sessions: SessionWithCounts[];
  total: number;
}

export function querySessionsPage(
  db: DatabaseHandle,
  options?: QuerySessionsOptions,
): QuerySessionsResult {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const offset = Math.max(options?.offset ?? 0, 0);
  const filter = options?.filter;

  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter?.channel) {
    clauses.push("s.key LIKE ?");
    params.push(`${filter.channel}:%`);
  }
  if (filter?.purpose) {
    clauses.push("s.purpose = ?");
    params.push(filter.purpose);
  }
  if (filter?.status === "open") {
    clauses.push("s.closed_at IS NULL");
  } else if (filter?.status === "closed") {
    clauses.push("s.closed_at IS NOT NULL AND s.distilled_at IS NULL");
  } else if (filter?.status === "distilled") {
    clauses.push("s.distilled_at IS NOT NULL");
  }
  if (filter?.search) {
    clauses.push("s.display_name LIKE ?");
    params.push(`%${filter.search}%`);
  }
  if (filter?.parentSessionId != null) {
    clauses.push("s.parent_session_id = ?");
    params.push(filter.parentSessionId);
  }
  if (filter?.soulId != null) {
    clauses.push("s.soul_id = ?");
    params.push(filter.soulId);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  let orderBy: string;
  switch (options?.sort) {
    case "oldest":
      orderBy = "s.last_active_at ASC";
      break;
    case "expensive":
      orderBy = "s.cost_usd DESC";
      break;
    case "tokens":
      orderBy = "(s.tokens_in + s.tokens_out) DESC";
      break;
    default:
      orderBy = "s.last_active_at DESC";
  }

  const total = (
    db.prepare(`SELECT COUNT(*) AS cnt FROM sessions s ${where}`).get(...params) as {
      cnt: number;
    }
  ).cnt;

  const rows = db
    .prepare(
      `SELECT s.*,
        (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS message_count,
        (SELECT COUNT(*) FROM sessions d WHERE d.purpose = 'delegate' AND d.parent_session_id = s.id) AS delegation_count
      FROM sessions s
      ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  return {
    total,
    sessions: rows.map((row) => ({
      ...rowToSession(row),
      messageCount: (row.message_count as number) ?? 0,
      delegationCount: (row.delegation_count as number) ?? 0,
    })),
  };
}
