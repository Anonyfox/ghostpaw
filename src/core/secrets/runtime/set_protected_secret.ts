import type { DatabaseHandle } from "../../../lib/index.ts";
import { upsertSecret } from "../upsert_secret.ts";

export function setProtectedSecret(db: DatabaseHandle, key: string, value: string): void {
  if (!key.toUpperCase().startsWith("WEB_UI_")) {
    throw new Error("Only protected WEB_UI_* secrets may use the runtime protected setter.");
  }
  upsertSecret(db, key, value);
  process.env[key] = value;
}
