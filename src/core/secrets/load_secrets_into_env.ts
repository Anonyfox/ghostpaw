import type { DatabaseHandle } from "../../lib/index.ts";
import { REVERSE_ALIASES } from "./reverse_aliases.ts";

export function loadSecretsIntoEnv(db: DatabaseHandle): void {
  const rows = db.prepare("SELECT key, value FROM secrets").all();
  for (const row of rows) {
    const key = row.key as string;
    const value = row.value as string;

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }

    const alias = REVERSE_ALIASES[key];
    if (alias && process.env[alias] === undefined) {
      process.env[alias] = value;
    }
  }
}
