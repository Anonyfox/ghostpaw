import type { TrailPreamble } from "./types.ts";

export function rowToPreamble(row: Record<string, unknown>): TrailPreamble {
  return {
    id: row.id as number,
    text: row.text as string,
    version: row.version as number,
    compiledAt: row.compiled_at as number,
  };
}
