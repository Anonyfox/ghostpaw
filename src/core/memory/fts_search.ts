import type { DatabaseHandle } from "../../lib/index.ts";
import { buildFtsQuery } from "./build_fts_query.ts";
import type { FtsHit, MemoryCategory } from "./types.ts";

const DEFAULT_LIMIT = 50;

export function ftsSearch(
  db: DatabaseHandle,
  queryText: string,
  options?: { limit?: number; category?: MemoryCategory; excludeIds?: number[] },
): FtsHit[] {
  const ftsQuery = buildFtsQuery(queryText);
  if (!ftsQuery) return [];

  const limit = Math.max(1, Math.trunc(options?.limit ?? DEFAULT_LIMIT));
  const excludeIds = options?.excludeIds ?? [];

  let sql = `
    SELECT m.id, m.claim, m.embedding, m.confidence,
           m.evidence_count, m.created_at, m.verified_at, m.source, m.category
    FROM memories_fts fts
    JOIN memories m ON m.id = fts.rowid
    WHERE memories_fts MATCH ? AND m.superseded_by IS NULL AND m.embedding IS NOT NULL`;

  const params: unknown[] = [ftsQuery];

  if (excludeIds.length > 0) {
    sql += ` AND m.id NOT IN (${excludeIds.map(() => "?").join(",")})`;
    params.push(...excludeIds);
  }

  if (options?.category) {
    sql += " AND m.category = ?";
    params.push(options.category);
  }

  sql += " ORDER BY fts.rank LIMIT ?";
  params.push(limit);

  const rows = db.prepare(sql).all(...params);

  return rows.map((row) => ({
    id: row.id as number,
    claim: row.claim as string,
    embedding: row.embedding as Uint8Array,
    confidence: row.confidence as number,
    evidenceCount: row.evidence_count as number,
    createdAt: row.created_at as number,
    verifiedAt: row.verified_at as number,
    source: row.source as FtsHit["source"],
    category: row.category as FtsHit["category"],
  }));
}
