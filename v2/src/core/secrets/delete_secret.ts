import type { DatabaseHandle } from "../../lib/database.ts";
import { canonicalKeyName } from "./canonicalize.ts";
import { REVERSE_ALIASES } from "./reverse_aliases.ts";

export function deleteSecret(db: DatabaseHandle, key: string): void {
  const canonical = canonicalKeyName(key);
  db.prepare("DELETE FROM secrets WHERE key = ?").run(canonical);
  delete process.env[canonical];
  const alias = REVERSE_ALIASES[canonical];
  if (alias) delete process.env[alias];
}
