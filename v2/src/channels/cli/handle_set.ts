import { canonicalKeyName, setSecret } from "../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export interface SetResult {
  success: boolean;
  canonical: string;
  aliased: boolean;
  warning?: string;
  error?: string;
}

export function handleSecretsSet(db: DatabaseHandle, key: string, value: string): SetResult {
  const canonical = canonicalKeyName(key);
  const aliased = canonical !== key;
  const result = setSecret(db, key, value);
  if (!result.value) {
    return { success: false, canonical, aliased, error: result.warning ?? "Empty value" };
  }
  return { success: true, canonical, aliased, warning: result.warning };
}
