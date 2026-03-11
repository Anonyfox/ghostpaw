import { canonicalKeyName, listStoredSecretKeys } from "../../../core/secrets/api/read/index.ts";
import { deleteSecret, setSecret } from "../../../core/secrets/api/write/index.ts";
import type { DatabaseHandle } from "../../../lib/index.ts";

export interface SecretSetResult {
  success: boolean;
  canonical: string;
  aliased: boolean;
  warning?: string;
  error?: string;
}

export function setManagedSecret(db: DatabaseHandle, key: string, value: string): SecretSetResult {
  const canonical = canonicalKeyName(key);
  if (isProtectedKey(canonical)) {
    return {
      success: false,
      canonical,
      aliased: canonical !== key,
      error: "Cannot modify internal keys.",
    };
  }

  const result = setSecret(db, key, value);
  if (!result.value) {
    return {
      success: false,
      canonical,
      aliased: canonical !== key,
      error: result.warning ?? "Value was empty after cleaning.",
    };
  }

  return {
    success: true,
    canonical,
    aliased: canonical !== key,
    warning: result.warning,
  };
}

export function deleteManagedSecret(
  db: DatabaseHandle,
  key: string,
): { canonical: string; existed: boolean } {
  const canonical = canonicalKeyName(key);
  if (isProtectedKey(canonical)) {
    throw new Error("Cannot modify internal keys.");
  }

  const existed = listStoredSecretKeys(db).includes(canonical);
  deleteSecret(db, canonical);
  return { canonical, existed };
}

function isProtectedKey(key: string): boolean {
  return key.toUpperCase().startsWith("WEB_UI_");
}
