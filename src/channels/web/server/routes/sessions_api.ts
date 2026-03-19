import type { SessionWithCounts } from "../../../../core/chat/api/read/index.ts";
import {
  deriveSessionTitle,
  getFullHistory,
  getSession,
  getSessionMessage,
  getSessionStats,
  listSessions,
  querySessionsPage,
} from "../../../../core/chat/api/read/index.ts";
import { pruneEmptySessions } from "../../../../core/chat/api/write/index.ts";
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

function statusOf(session: { closedAt: number | null; distilledAt: number | null }): SessionStatus {
  if (session.distilledAt) return "distilled";
  if (session.closedAt) return "closed";
  return "open";
}

function parseQuery(req: { url?: string }): URLSearchParams {
  const url = req.url ?? "";
  const q = url.indexOf("?");
  return new URLSearchParams(q >= 0 ? url.slice(q + 1) : "");
}

function sessionPreview(db: DatabaseHandle, sessionId: number): string {
  const raw = getSessionMessage(db, sessionId, "user", "first") ?? "";
  const text = raw.replace(/\s+/g, " ").trim();
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

function toSessionInfo(db: DatabaseHandle, s: SessionWithCounts): SessionInfo {
  const preview = sessionPreview(db, s.id);
  const displayName = s.displayName || deriveSessionTitle(preview) || s.key;

  return {
    id: s.id,
    key: s.key,
    channel: channelFromKey(s.key),
    purpose: s.purpose,
    status: statusOf(s),
    displayName,
    preview,
    model: s.model,
    createdAt: s.createdAt,
    lastActiveAt: s.lastActiveAt,
    tokensIn: s.tokensIn,
    tokensOut: s.tokensOut,
    reasoningTokens: s.reasoningTokens,
    cachedTokens: s.cachedTokens,
    costUsd: s.costUsd,
    messageCount: s.messageCount,
    parentSessionId: s.parentSessionId,
    delegationCount: s.delegationCount,
  };
}

export function createSessionsApiHandlers(db: DatabaseHandle) {
  return {
    list(ctx: RouteContext): void {
      const q = parseQuery(ctx.req);
      const channel = q.get("channel") || undefined;
      const purpose = q.get("purpose") || undefined;
      const status = q.get("status") as "open" | "closed" | "distilled" | undefined;
      const sort = (q.get("sort") || "recent") as "recent" | "oldest" | "expensive" | "tokens";
      const search = q.get("search") || undefined;
      const limit = Math.min(Number.parseInt(q.get("limit") || "50", 10), 200);
      const offset = Math.max(Number.parseInt(q.get("offset") || "0", 10), 0);

      const result = querySessionsPage(db, {
        filter: { channel, purpose: purpose as never, status, search },
        sort,
        limit,
        offset,
      });

      const sessions = result.sessions.map((s) => toSessionInfo(db, s));
      json(ctx, 200, { sessions, total: result.total });
    },

    stats(ctx: RouteContext): void {
      const stats = getSessionStats(db);
      const response: SessionStatsResponse = stats;
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

      const rawMessages = getFullHistory(db, id);
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

      const childSessions = listSessions(db, { purpose: "delegate", parentSessionId: id });
      const runs: SessionRunInfo[] = childSessions.map((s) => ({
        id: s.id,
        specialist: null,
        model: s.model,
        task: null,
        status: s.error ? "failed" : s.closedAt ? "completed" : "running",
        result: null,
        error: s.error,
        costUsd: s.costUsd,
        tokensIn: s.tokensIn,
        tokensOut: s.tokensOut,
        createdAt: s.createdAt,
        completedAt: s.closedAt,
        childSessionId: s.id,
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

      const preview = sessionPreview(db, id);
      const sessionInfo: SessionInfo = {
        id: session.id,
        key: session.key,
        channel: channelFromKey(session.key),
        purpose: session.purpose,
        status: statusOf(session),
        displayName: session.displayName || deriveSessionTitle(preview) || session.key,
        preview,
        model: session.model,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        tokensIn: session.tokensIn,
        tokensOut: session.tokensOut,
        reasoningTokens: session.reasoningTokens,
        cachedTokens: session.cachedTokens,
        costUsd: session.costUsd,
        messageCount: rawMessages.length,
        parentSessionId: session.parentSessionId,
        delegationCount: childSessions.length,
      };

      const response: SessionDetailResponse = {
        session: sessionInfo,
        messages,
        runs,
        parentSession,
      };
      json(ctx, 200, response);
    },

    prune(ctx: RouteContext): void {
      const pruned = pruneEmptySessions(db);
      json(ctx, 200, { pruned });
    },
  };
}
