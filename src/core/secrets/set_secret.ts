import type { DatabaseHandle } from "../../lib/index.ts";
import { canonicalKeyName } from "./canonicalize.ts";
import { cleanKeyValue } from "./clean.ts";
import { REVERSE_ALIASES } from "./reverse_aliases.ts";
import type { CleanResult } from "./types.ts";
import { upsertSecret } from "./upsert_secret.ts";

export function setSecret(db: DatabaseHandle, key: string, value: string): CleanResult {
  const canonical = canonicalKeyName(key);
  const cleaned = cleanKeyValue(canonical, value);
  if (!cleaned.value) return cleaned;

  upsertSecret(db, canonical, cleaned.value);

  process.env[canonical] = cleaned.value;
  const alias = REVERSE_ALIASES[canonical];
  if (alias) process.env[alias] = cleaned.value;

  return cleaned;
}
