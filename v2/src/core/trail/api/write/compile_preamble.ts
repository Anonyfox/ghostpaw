import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { TrailPreamble } from "../../internal/index.ts";
import { rowToPreamble } from "../../internal/index.ts";

export type CompilePreambleResult = { changed: true; preamble: TrailPreamble } | { changed: false };

export function compilePreamble(db: DatabaseHandle, candidate: string): CompilePreambleResult {
  const trimmed = candidate.trim();
  if (trimmed.length === 0) {
    return { changed: false };
  }

  const latest = db
    .prepare("SELECT * FROM trail_preamble ORDER BY compiled_at DESC LIMIT 1")
    .get() as Record<string, unknown> | undefined;

  if (latest && (latest.text as string) === trimmed) {
    return { changed: false };
  }

  const now = Date.now();
  const nextVersion = latest ? (latest.version as number) + 1 : 1;

  const { lastInsertRowid } = db
    .prepare("INSERT INTO trail_preamble (text, version, compiled_at) VALUES (?, ?, ?)")
    .run(trimmed, nextVersion, now);

  const row = db.prepare("SELECT * FROM trail_preamble WHERE id = ?").get(lastInsertRowid);
  return { changed: true, preamble: rowToPreamble(row as Record<string, unknown>) };
}
