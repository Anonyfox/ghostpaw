import { canonicalKeyName, deleteSecret, getSecret } from "../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export function handleSecretsDelete(db: DatabaseHandle, key: string): boolean {
  const canonical = canonicalKeyName(key);
  const existed = getSecret(db, canonical) !== null;
  deleteSecret(db, key);
  return existed;
}
