import type { GhostpawDatabase } from "./database.js";
import { isNullRow } from "./database.js";

export interface SecretStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
  keys(): string[];
  loadIntoEnv(): void;
  syncProviderKeys(): void;
}

export const PROVIDER_ALIASES: Record<string, string> = {
  ANTHROPIC_API_KEY: "API_KEY_ANTHROPIC",
  OPENAI_API_KEY: "API_KEY_OPENAI",
  XAI_API_KEY: "API_KEY_XAI",
};

const REVERSE_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDER_ALIASES).map(([alias, canonical]) => [canonical, alias]),
);

export function canonicalKeyName(key: string): string {
  return PROVIDER_ALIASES[key] ?? key;
}

export function createSecretStore(db: GhostpawDatabase): SecretStore {
  const { sqlite } = db;

  function get(key: string): string | null {
    const normalized = canonicalKeyName(key);
    const row = sqlite.prepare("SELECT value FROM secrets WHERE key = ?").get(normalized) as
      | Record<string, unknown>
      | undefined;
    if (isNullRow(row)) return null;
    return row.value as string;
  }

  function set(key: string, value: string): void {
    const normalized = canonicalKeyName(key);
    sqlite
      .prepare(
        "INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      )
      .run(normalized, value, Date.now());
    process.env[normalized] = value;
    // Also set the user-facing alias so both names are available
    const alias = REVERSE_ALIASES[normalized];
    if (alias) process.env[alias] = value;
  }

  function del(key: string): void {
    const normalized = canonicalKeyName(key);
    sqlite.prepare("DELETE FROM secrets WHERE key = ?").run(normalized);
    delete process.env[normalized];
    const reverseAlias = REVERSE_ALIASES[normalized];
    if (reverseAlias) delete process.env[reverseAlias];
  }

  function keys(): string[] {
    const rows = sqlite.prepare("SELECT key FROM secrets ORDER BY key").all() as Record<
      string,
      unknown
    >[];
    return rows.map((r) => r.key as string);
  }

  function loadIntoEnv(): void {
    const rows = sqlite.prepare("SELECT key, value FROM secrets").all() as Record<
      string,
      unknown
    >[];
    for (const row of rows) {
      const k = row.key as string;
      if (process.env[k] === undefined) {
        process.env[k] = row.value as string;
      }
    }
  }

  function syncProviderKeys(): void {
    for (const [alias, canonical] of Object.entries(PROVIDER_ALIASES)) {
      const fromAlias = process.env[alias];
      const fromCanonical = process.env[canonical];
      const envVal = fromAlias !== undefined ? fromAlias : fromCanonical;
      if (envVal === undefined || envVal === "") continue;

      // Ensure canonical env var always reflects the resolved value
      process.env[canonical] = envVal;

      const dbVal = get(canonical);
      if (dbVal !== envVal) {
        sqlite
          .prepare(
            "INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
          )
          .run(canonical, envVal, Date.now());
      }
    }
  }

  return { get, set, delete: del, keys, loadIntoEnv, syncProviderKeys };
}
