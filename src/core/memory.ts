import { generateId } from "../lib/ids.js";
import { bufferToVector, topK, vectorToBuffer } from "../lib/vectors.js";
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

      // Phase 1: fetch only id + embedding BLOB (no content, no metadata)
      let rows: Record<string, unknown>[];

      if (sessionId && includeGlobal) {
        rows = sqlite
          .prepare(
            "SELECT id, embedding FROM memory WHERE embedding IS NOT NULL AND (session_id = ? OR session_id IS NULL)",
          )
          .all(sessionId) as Record<string, unknown>[];
      } else if (sessionId) {
        rows = sqlite
          .prepare(
            "SELECT id, embedding FROM memory WHERE embedding IS NOT NULL AND session_id = ?",
          )
          .all(sessionId) as Record<string, unknown>[];
      } else {
        rows = sqlite
          .prepare("SELECT id, embedding FROM memory WHERE embedding IS NOT NULL")
          .all() as Record<string, unknown>[];
      }

      if (rows.length === 0) return [];

      const queryVec = new Float32Array(queryEmbedding);
      const candidates = rows.map((row) => ({
        id: row.id as string,
        embedding: bufferToVector(row.embedding as Buffer),
      }));

      const scored = topK(queryVec, candidates, k, minScore);

      if (scored.length === 0) return [];

      // Phase 2: hydrate only the winning rows with full content
      const ids = scored.map((s) => s.id);
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

      return scored
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
