import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { TrailPreamble } from "../../internal/index.ts";
import { rowToPreamble } from "../../internal/index.ts";

export function getCompiledPreamble(db: DatabaseHandle): TrailPreamble | null {
  const row = db.prepare("SELECT * FROM trail_preamble ORDER BY compiled_at DESC LIMIT 1").get() as
    | Record<string, unknown>
    | undefined;
  return row ? rowToPreamble(row) : null;
}
