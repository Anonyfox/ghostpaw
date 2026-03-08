import type { IncomingMessage } from "node:http";
import { freshness } from "../../../../core/memory/freshness.ts";
import {
  countMemories,
  getMemory,
  listMemories,
  recallMemories,
  staleMemories,
} from "../../../../core/memory/index.ts";
import type { Memory, RankedMemory } from "../../../../core/memory/types.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type {
  MemoryDetailResponse,
  MemoryInfo,
  MemorySearchResult,
  MemoryStrength,
} from "../../shared/memory_types.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

function strength(confidence: number): MemoryStrength {
  if (confidence >= 0.7) return "strong";
  if (confidence >= 0.4) return "fading";
  return "faint";
}

function toInfo(m: Memory): MemoryInfo {
  const now = Date.now();
  return {
    id: m.id,
    claim: m.claim,
    confidence: m.confidence,
    evidenceCount: m.evidenceCount,
    createdAt: m.createdAt,
    verifiedAt: m.verifiedAt,
    source: m.source,
    category: m.category,
    supersededBy: m.supersededBy,
    strength: strength(m.confidence),
    freshness: freshness(m.verifiedAt, m.evidenceCount, now),
  };
}

function toSearchResult(m: RankedMemory): MemorySearchResult {
  const now = Date.now();
  return {
    id: m.id,
    claim: m.claim,
    confidence: m.confidence,
    evidenceCount: m.evidenceCount,
    createdAt: m.createdAt,
    verifiedAt: m.verifiedAt,
    source: m.source,
    category: m.category,
    supersededBy: m.supersededBy,
    strength: strength(m.confidence),
    freshness: freshness(m.verifiedAt, m.evidenceCount, now),
    score: m.score,
    similarity: m.similarity,
  };
}

function parseQuery(url: string | undefined): URLSearchParams {
  if (!url) return new URLSearchParams();
  const idx = url.indexOf("?");
  if (idx < 0) return new URLSearchParams();
  return new URLSearchParams(url.slice(idx + 1));
}

async function parseBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  try {
    const body = await readJsonBody(req);
    if (typeof body === "object" && body !== null) return body as Record<string, unknown>;
  } catch {
    /* invalid body */
  }
  return null;
}

export function createMemoryApiHandlers(db: DatabaseHandle) {
  return {
    list(ctx: RouteContext): void {
      const qs = parseQuery(ctx.req.url);
      const category = qs.get("category") || undefined;
      const strengthFilter = qs.get("strength") || undefined;
      const sort = qs.get("sort") || "newest";
      const limit = Math.min(500, Math.max(1, Number(qs.get("limit")) || 100));
      const offset = Math.max(0, Number(qs.get("offset")) || 0);
      const staleOnly = qs.get("stale") === "1";

      if (staleOnly) {
        const stale = staleMemories(db, limit);
        json(ctx, 200, { memories: stale.map(toInfo), total: stale.length });
        return;
      }

      const minConfidence =
        strengthFilter === "strong" ? 0.7 : strengthFilter === "fading" ? 0.4 : undefined;

      const all = listMemories(db, {
        category: category as Memory["category"] | undefined,
        minConfidence,
        limit: 1000,
        offset: 0,
      });

      let filtered = all;
      if (strengthFilter === "fading") {
        filtered = all.filter((m) => m.confidence >= 0.4 && m.confidence < 0.7);
      } else if (strengthFilter === "faint") {
        filtered = all.filter((m) => m.confidence < 0.4);
      }

      const now = Date.now();
      const sortFns: Record<string, (a: Memory, b: Memory) => number> = {
        newest: (a, b) => b.createdAt - a.createdAt,
        oldest: (a, b) => a.createdAt - b.createdAt,
        confidence_desc: (a, b) => b.confidence - a.confidence,
        confidence_asc: (a, b) => a.confidence - b.confidence,
        evidence: (a, b) => b.evidenceCount - a.evidenceCount,
        stalest: (a, b) => {
          const ageA = (now - a.verifiedAt) * a.evidenceCount;
          const ageB = (now - b.verifiedAt) * b.evidenceCount;
          return ageB - ageA;
        },
      };
      const sortFn = sortFns[sort] ?? sortFns.newest;
      filtered.sort(sortFn);

      const page = filtered.slice(offset, offset + limit);
      json(ctx, 200, { memories: page.map(toInfo), total: filtered.length });
    },

    stats(ctx: RouteContext): void {
      const counts = countMemories(db);
      const active = listMemories(db, { limit: 10000 });

      let strong = 0;
      let fading = 0;
      let faint = 0;
      const byCategory: Record<string, number> = {};

      for (const m of active) {
        if (m.confidence >= 0.7) strong++;
        else if (m.confidence >= 0.4) fading++;
        else faint++;

        byCategory[m.category] = (byCategory[m.category] ?? 0) + 1;
      }

      const stale = staleMemories(db, 100);

      json(ctx, 200, {
        active: counts.active,
        total: counts.total,
        strong,
        fading,
        faint,
        stale: stale.length,
        byCategory,
      });
    },

    search(ctx: RouteContext): void {
      const qs = parseQuery(ctx.req.url);
      const q = qs.get("q") ?? "";
      if (!q.trim()) {
        json(ctx, 200, { memories: [] });
        return;
      }
      const category = qs.get("category") || undefined;
      const results = recallMemories(db, q, {
        k: 20,
        category: category as Memory["category"] | undefined,
      });
      json(ctx, 200, { memories: results.map(toSearchResult) });
    },

    detail(ctx: RouteContext): void {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid memory ID." });
        return;
      }
      const mem = getMemory(db, id);
      if (!mem) {
        json(ctx, 404, { error: "Memory not found." });
        return;
      }

      const supersedes = db
        .prepare("SELECT id FROM memories WHERE superseded_by = ? AND id != ?")
        .all(id, id) as Array<Record<string, unknown>>;
      const supersedesId = supersedes.length > 0 ? (supersedes[0].id as number) : null;

      const detail: MemoryDetailResponse = {
        ...toInfo(mem),
        supersedes: supersedesId,
      };
      json(ctx, 200, detail);
    },

    async command(ctx: RouteContext): Promise<void> {
      const body = await parseBody(ctx.req);
      if (!body) {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) {
        json(ctx, 400, { error: "text is required." });
        return;
      }
      const memoryId =
        typeof body.memoryId === "number" && body.memoryId > 0 ? body.memoryId : undefined;

      try {
        const { executeCommand } = await import("../../../../harness/oneshots/execute_command.ts");
        const { resolveModel } = await import("../../../../harness/model.ts");
        const { defaultChatFactory } = await import("../../../../harness/chat_factory.ts");

        const model = resolveModel(db);
        const result = await executeCommand(db, model, defaultChatFactory, {
          text,
          channel: "web",
          memoryId,
        });

        json(ctx, 200, {
          response: result.response,
          cost: result.cost,
          sessionId: result.sessionId,
          acted: result.acted,
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },
  };
}
