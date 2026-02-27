import { type DatabaseHandle, isNullRow } from "../../lib/index.ts";
import { canonicalKeyName } from "./canonicalize.ts";

export function getSecret(db: DatabaseHandle, key: string): string | null {
  const canonical = canonicalKeyName(key);
  const row = db.prepare("SELECT value FROM secrets WHERE key = ?").get(canonical);
  if (isNullRow(row)) return null;
  return row.value as string;
}
