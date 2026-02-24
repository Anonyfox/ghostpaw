import { generateId } from "../lib/ids.js";
import { bufferToVector, cosineSimilarity, vectorToBuffer } from "../lib/vectors.js";
import { type GhostpawDatabase, isNullRow } from "./database.js";

export interface Memory {
  id: string;
  sessionId: string | null;
  content: string;
  createdAt: number;
  source: string;
}

export interface MemoryMatch extends Memory {
  score: number;
}

export interface StoreOptions {
  sessionId?: string;
  source?: string;
}

export interface SearchOptions {
  k?: number;
  minScore?: number;
  sessionId?: string;
  includeGlobal?: boolean;
  /** Blend factor for recency (0 = pure similarity, 1 = pure recency). Default 0.15 */
  recencyWeight?: number;
}

export interface MemoryStore {
  store(content: string, embedding: number[], options?: StoreOptions): Memory;
  get(id: string): Memory | null;
  delete(id: string): void;
  deleteBySession(sessionId: string): void;
  list(sessionId?: string): Memory[];
  search(queryEmbedding: number[], options?: SearchOptions): MemoryMatch[];
  count(sessionId?: string): number;
}

function rowToMemory(row: Record<string, unknown>): Memory {
  return {
    id: row.id as string,
    sessionId: (row.session_id as string) ?? null,
    content: row.content as string,
    createdAt: row.created_at as number,
    source: (row.source as string) ?? "manual",
  };
}

export function createMemoryStore(db: GhostpawDatabase): MemoryStore {
  const { sqlite } = db;

  return {
    store(content: string, embedding: number[], options?: StoreOptions): Memory {
      const id = generateId();
      const now = Date.now();
      const sessionId = options?.sessionId ?? null;
      const source = options?.source ?? "manual";
      const blob = vectorToBuffer(embedding);

      sqlite
        .prepare(
          "INSERT INTO memory (id, session_id, content, embedding, created_at, source) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(id, sessionId, content, blob, now, source);

      return { id, sessionId, content, createdAt: now, source };
    },

    get(id: string): Memory | null {
      const row = sqlite
        .prepare("SELECT id, session_id, content, created_at, source FROM memory WHERE id = ?")
        .get(id) as Record<string, unknown> | undefined;
      return isNullRow(row) ? null : rowToMemory(row);
    },

    delete(id: string): void {
      sqlite.prepare("DELETE FROM memory WHERE id = ?").run(id);
    },

    deleteBySession(sessionId: string): void {
      sqlite.prepare("DELETE FROM memory WHERE session_id = ?").run(sessionId);
    },

    list(sessionId?: string): Memory[] {
      if (sessionId) {
        return (
          sqlite
            .prepare(
              "SELECT id, session_id, content, created_at, source FROM memory WHERE session_id = ? ORDER BY created_at DESC",
            )
            .all(sessionId) as Record<string, unknown>[]
        ).map(rowToMemory);
      }
      return (
        sqlite
          .prepare(
            "SELECT id, session_id, content, created_at, source FROM memory ORDER BY created_at DESC",
          )
          .all() as Record<string, unknown>[]
      ).map(rowToMemory);
    },

    search(queryEmbedding: number[], options?: SearchOptions): MemoryMatch[] {
      const k = options?.k ?? 5;
      const minScore = options?.minScore ?? -Infinity;
      const sessionId = options?.sessionId;
      const includeGlobal = options?.includeGlobal ?? false;
      const recencyWeight = options?.recencyWeight ?? 0.15;

      // Phase 1: fetch id + embedding + created_at for scoring
      const select = "SELECT id, embedding, created_at FROM memory WHERE embedding IS NOT NULL";
      let rows: Record<string, unknown>[];

      if (sessionId && includeGlobal) {
        rows = sqlite
          .prepare(`${select} AND (session_id = ? OR session_id IS NULL)`)
          .all(sessionId) as Record<string, unknown>[];
      } else if (sessionId) {
        rows = sqlite.prepare(`${select} AND session_id = ?`).all(sessionId) as Record<
          string,
          unknown
        >[];
      } else {
        rows = sqlite.prepare(select).all() as Record<string, unknown>[];
      }

      if (rows.length === 0) return [];

      const queryVec = new Float32Array(queryEmbedding);
      const now = Date.now();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

      // Score = (1 - w) * similarity + w * recency
      // Recency: 1.0 for just-created, decays toward 0 over 30 days
      const scored: { id: string; score: number }[] = [];
      for (const row of rows) {
        const embedding = bufferToVector(row.embedding as Buffer);
        const similarity = cosineSimilarity(queryVec, embedding);
        if (similarity < minScore) continue;

        const age = Math.max(0, now - (row.created_at as number));
        const recency = Math.max(0, 1 - age / THIRTY_DAYS_MS);
        const blended = (1 - recencyWeight) * similarity + recencyWeight * recency;

        scored.push({ id: row.id as string, score: blended });
      }

      scored.sort((a, b) => b.score - a.score);
      const topResults = scored.slice(0, k);

      if (topResults.length === 0) return [];

      // Phase 2: hydrate only the winning rows with full content
      const ids = topResults.map((s) => s.id);
      const placeholders = ids.map(() => "?").join(",");
      const fullRows = sqlite
        .prepare(
          `SELECT id, session_id, content, created_at, source FROM memory WHERE id IN (${placeholders})`,
        )
        .all(...ids) as Record<string, unknown>[];

      const rowMap = new Map<string, Memory>();
      for (const row of fullRows) {
        rowMap.set(row.id as string, rowToMemory(row));
      }

      return topResults
        .map((s) => {
          const mem = rowMap.get(s.id);
          if (!mem) return null;
          return { ...mem, score: s.score };
        })
        .filter((m): m is MemoryMatch => m !== null);
    },

    count(sessionId?: string): number {
      if (sessionId) {
        const row = sqlite
          .prepare("SELECT COUNT(*) as cnt FROM memory WHERE session_id = ?")
          .get(sessionId) as Record<string, unknown>;
        return (row?.cnt as number) ?? 0;
      }
      const row = sqlite.prepare("SELECT COUNT(*) as cnt FROM memory").get() as Record<
        string,
        unknown
      >;
      return (row?.cnt as number) ?? 0;
    },
  };
}
