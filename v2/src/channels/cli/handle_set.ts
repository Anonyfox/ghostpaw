import { setManagedSecret } from "../../harness/public/settings/secrets.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export interface SetResult {
  success: boolean;
  canonical: string;
  aliased: boolean;
  warning?: string;
  error?: string;
}

export function handleSecretsSet(db: DatabaseHandle, key: string, value: string): SetResult {
  const result = setManagedSecret(db, key, value);
  if (!result.success) {
    return {
      success: false,
      canonical: result.canonical,
      aliased: result.aliased,
      error: result.error,
    };
  }
  return {
    success: true,
    canonical: result.canonical,
    aliased: result.aliased,
    warning: result.warning,
  };
}
