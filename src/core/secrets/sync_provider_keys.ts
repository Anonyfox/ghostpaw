import type { DatabaseHandle } from "../../lib/index.ts";
import { getSecret } from "./get_secret.ts";
import { KNOWN_KEYS } from "./known_keys.ts";
import { upsertSecret } from "./upsert_secret.ts";

export function syncProviderKeys(db: DatabaseHandle): void {
  for (const known of KNOWN_KEYS) {
    let envVal: string | undefined;

    for (const alias of known.aliases) {
      if (process.env[alias] !== undefined && process.env[alias] !== "") {
        envVal = process.env[alias];
        break;
      }
    }

    if (envVal === undefined) {
      const fromCanonical = process.env[known.canonical];
      if (fromCanonical !== undefined && fromCanonical !== "") {
        envVal = fromCanonical;
      }
    }

    if (envVal === undefined) continue;

    process.env[known.canonical] = envVal;

    const dbVal = getSecret(db, known.canonical);
    if (dbVal !== envVal) {
      upsertSecret(db, known.canonical, envVal);
    }
  }
}
