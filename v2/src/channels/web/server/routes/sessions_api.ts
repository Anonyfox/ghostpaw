import { deriveSessionTitle, getHistory, getSession } from "../../../../core/chat/index.ts";
import { listRuns } from "../../../../core/runs/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type {
  SessionDetailResponse,
  SessionInfo,
  SessionMessageInfo,
  SessionRunInfo,
  SessionStatsResponse,
  SessionStatus,
} from "../../shared/session_types.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

function channelFromKey(key: string): string {
  const colon = key.indexOf(":");
  return colon > 0 ? key.slice(0, colon) : "unknown";
}

function statusOf(row: { closed_at: unknown; distilled_at: unknown }): SessionStatus {
  if (row.distilled_at) return "distilled";
  if (row.closed_at) return "closed";
  return "open";
}

function parseQuery(req: { url?: string }): URLSearchParams {
  const url = req.url ?? "";
  const q = url.indexOf("?");
  return new URLSearchParams(q >= 0 ? url.slice(q + 1) : "");
}

function firstUserMessage(db: DatabaseHandle, sessionId: number): string {
  const row = db
    .prepare(
      "SELECT content FROM messages WHERE session_id = ? AND role = 'user' ORDER BY id ASC LIMIT 1",
    )
    .get(sessionId) as { content: string } | undefined;
  if (!row) return "";
  const text = row.content.replace(/\s+/g, " ").trim();
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

function toSessionInfo(db: DatabaseHandle, row: Record<string, unknown>): SessionInfo {
  const id = row.id as number;
  const key = row.key as string;
  const displayName =
    (row.display_name as string) || deriveSessionTitle(firstUserMessage(db, id)) || key;

  return {
    id,
    key,
    channel: channelFromKey(key),
    purpose: (row.purpose as string) ?? "chat",
    status: statusOf(row as { closed_at: unknown; distilled_at: unknown }),
    displayName,
    preview: firstUserMessage(db, id),
    model: (row.model as string) ?? null,
    createdAt: row.created_at as number,
    lastActiveAt: row.last_active_at as number,
    tokensIn: (row.tokens_in as number) ?? 0,
    tokensOut: (row.tokens_out as number) ?? 0,
    reasoningTokens: (row.reasoning_tokens as number) ?? 0,
    cachedTokens: (row.cached_tokens as number) ?? 0,
    costUsd: (row.cost_usd as number) ?? 0,
    messageCount: (row.message_count as number) ?? 0,
    parentSessionId: (row.parent_session_id as number) ?? null,
    delegationCount: (row.delegation_count as number) ?? 0,
  };
}

export function createSessionsApiHandlers(db: DatabaseHandle) {
  return {
    list(ctx: RouteContext): void {
      const q = parseQuery(ctx.req);
      const channel = q.get("channel") || undefined;
      const purpose = q.get("purpose") || undefined;
      const status = q.get("status") || undefined;
      const sort = q.get("sort") || "recent";
      const search = q.get("search") || undefined;
      const limit = Math.min(Number.parseInt(q.get("limit") || "50", 10), 200);
      const offset = Math.max(Number.parseInt(q.get("offset") || "0", 10), 0);

      const clauses: string[] = [];
      const params: unknown[] = [];

      if (channel) {
        clauses.push("s.key LIKE ?");
        params.push(`${channel}:%`);
      }
      if (purpose) {
        clauses.push("s.purpose = ?");
        params.push(purpose);
      }
      if (status === "open") clauses.push("s.closed_at IS NULL");
      else if (status === "closed")
        clauses.push("s.closed_at IS NOT NULL AND s.distilled_at IS NULL");
      else if (status === "distilled") clauses.push("s.distilled_at IS NOT NULL");

      if (search) {
        clauses.push("s.display_name LIKE ?");
        params.push(`%${search}%`);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

      let orderBy = "s.last_active_at DESC";
      if (sort === "oldest") orderBy = "s.last_active_at ASC";
      else if (sort === "expensive") orderBy = "s.cost_usd DESC";
      else if (sort === "tokens") orderBy = "(s.tokens_in + s.tokens_out) DESC";

      const countRow = db
        .prepare(`SELECT COUNT(*) AS cnt FROM sessions s ${where}`)
        .get(...params) as unknown as { cnt: number };
      const total = countRow.cnt;

      const rows = db
        .prepare(
          `SELECT s.*,
            (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS message_count,
            (SELECT COUNT(*) FROM delegation_runs d WHERE d.parent_session_id = s.id) AS delegation_count
          FROM sessions s
          ${where}
          ORDER BY ${orderBy}
          LIMIT ? OFFSET ?`,
        )
        .all(...params, limit, offset) as unknown as Record<string, unknown>[];

      const sessions = rows.map((r) => toSessionInfo(db, r));
      json(ctx, 200, { sessions, total });
    },

    stats(ctx: RouteContext): void {
      const totals = db
        .prepare(
          `SELECT
            COUNT(*) AS total,
            COUNT(CASE WHEN closed_at IS NULL THEN 1 END) AS open,
            COUNT(CASE WHEN closed_at IS NOT NULL AND distilled_at IS NULL THEN 1 END) AS closed,
            COUNT(CASE WHEN distilled_at IS NOT NULL THEN 1 END) AS distilled
          FROM sessions`,
        )
        .get() as unknown as { total: number; open: number; closed: number; distilled: number };

      const channelRows = db
        .prepare(
          `SELECT
            CASE
              WHEN key LIKE 'web:%' THEN 'web'
              WHEN key LIKE 'telegram:%' THEN 'telegram'
              WHEN key LIKE 'delegate:%' THEN 'delegate'
              WHEN key LIKE 'system:%' THEN 'system'
              WHEN key LIKE 'cli:%' THEN 'cli'
              ELSE 'other'
            END AS channel,
            COUNT(*) AS cnt
          FROM sessions GROUP BY channel`,
        )
        .all() as unknown as { channel: string; cnt: number }[];

      const byChannel: Record<string, number> = {};
      for (const r of channelRows) byChannel[r.channel] = r.cnt;

      const purposeRows = db
        .prepare("SELECT purpose, COUNT(*) AS cnt FROM sessions GROUP BY purpose")
        .all() as unknown as { purpose: string; cnt: number }[];

      const byPurpose: Record<string, number> = {};
      for (const r of purposeRows) byPurpose[r.purpose] = r.cnt;

      const response: SessionStatsResponse = { ...totals, byChannel, byPurpose };
      json(ctx, 200, response);
    },

    detail(ctx: RouteContext): void {
      const id = Number.parseInt(ctx.params.id ?? "", 10);
      if (Number.isNaN(id)) {
        json(ctx, 400, { error: "Invalid session ID." });
        return;
      }

      const session = getSession(db, id);
      if (!session) {
        json(ctx, 404, { error: "Session not found." });
        return;
      }

      const rawMessages = getHistory(db, id);
      const messages: SessionMessageInfo[] = rawMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        model: m.model,
        createdAt: m.createdAt,
        isCompaction: m.isCompaction,
        toolData: m.toolData,
        costUsd: m.costUsd,
        tokensOut: m.tokensOut,
      }));

      const rawRuns = listRuns(db, id);
      const runs: SessionRunInfo[] = rawRuns.map((r) => ({
        id: r.id,
        specialist: r.specialist,
        model: r.model,
        task: r.task,
        status: r.status,
        result: r.result,
        error: r.error,
        costUsd: r.costUsd,
        tokensIn: r.tokensIn,
        tokensOut: r.tokensOut,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
        childSessionId: r.childSessionId,
      }));

      let parentSession: { id: number; displayName: string } | null = null;
      if (session.parentSessionId) {
        const parent = getSession(db, session.parentSessionId);
        if (parent) {
          parentSession = {
            id: parent.id,
            displayName: parent.displayName || deriveSessionTitle("") || parent.key,
          };
        }
      }

      const sessionRow = db
        .prepare(
          `SELECT s.*,
          (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS message_count,
          (SELECT COUNT(*) FROM delegation_runs d WHERE d.parent_session_id = s.id) AS delegation_count
        FROM sessions s WHERE s.id = ?`,
        )
        .get(id) as unknown as Record<string, unknown>;

      const sessionInfo = toSessionInfo(db, sessionRow);

      const response: SessionDetailResponse = {
        session: sessionInfo,
        messages,
        runs,
        parentSession,
      };
      json(ctx, 200, response);
    },

    prune(ctx: RouteContext): void {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const result = db
        .prepare(
          `DELETE FROM sessions
          WHERE created_at < ?
            AND id NOT IN (SELECT DISTINCT session_id FROM messages)
            AND id NOT IN (
              SELECT parent_session_id FROM delegation_runs WHERE status = 'running'
              UNION
              SELECT child_session_id FROM delegation_runs
                WHERE status = 'running' AND child_session_id IS NOT NULL
            )`,
        )
        .run(oneHourAgo);
      json(ctx, 200, { pruned: result.changes });
    },
  };
}
