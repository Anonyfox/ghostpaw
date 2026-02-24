import type { GhostpawDatabase } from "./database.js";
import { isNullRow } from "./database.js";

export interface SecretStore {
  get(key: string): string | null;
  set(key: string, value: string): CleanResult;
  delete(key: string): void;
  keys(): string[];
  loadIntoEnv(): void;
  syncProviderKeys(): void;
}

// ── Unified known keys registry ─────────────────────────────────────────────

export interface KnownKey {
  canonical: string;
  aliases: string[];
  label: string;
  category: "llm" | "search";
}

export const KNOWN_KEYS: KnownKey[] = [
  {
    canonical: "API_KEY_ANTHROPIC",
    aliases: ["ANTHROPIC_API_KEY"],
    label: "Anthropic",
    category: "llm",
  },
  { canonical: "API_KEY_OPENAI", aliases: ["OPENAI_API_KEY"], label: "OpenAI", category: "llm" },
  { canonical: "API_KEY_XAI", aliases: ["XAI_API_KEY"], label: "xAI", category: "llm" },
  { canonical: "BRAVE_API_KEY", aliases: [], label: "Brave Search", category: "search" },
  { canonical: "TAVILY_API_KEY", aliases: [], label: "Tavily", category: "search" },
  { canonical: "SERPER_API_KEY", aliases: [], label: "Serper", category: "search" },
];

// Derived lookup tables for backwards compatibility
export const PROVIDER_ALIASES: Record<string, string> = Object.fromEntries(
  KNOWN_KEYS.flatMap((k) => k.aliases.map((alias) => [alias, k.canonical])),
);

const REVERSE_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDER_ALIASES).map(([alias, canonical]) => [canonical, alias]),
);

export function canonicalKeyName(key: string): string {
  return PROVIDER_ALIASES[key] ?? key;
}

/** Determine which search provider would be active based on env/DB state. */
export function activeSearchProvider(): KnownKey | null {
  const order = ["BRAVE_API_KEY", "TAVILY_API_KEY", "SERPER_API_KEY"];
  for (const canonical of order) {
    if (process.env[canonical]) {
      return KNOWN_KEYS.find((k) => k.canonical === canonical) ?? null;
    }
  }
  return null;
}

// ── Key validation and cleaning ─────────────────────────────────────────────

const KEY_PREFIXES: Record<string, string[]> = {
  API_KEY_ANTHROPIC: ["sk-ant-"],
  API_KEY_OPENAI: ["sk-"],
  API_KEY_XAI: ["xai-"],
  BRAVE_API_KEY: ["BSA"],
  TAVILY_API_KEY: ["tvly-"],
};

export interface CleanResult {
  value: string;
  warning?: string;
}

export function cleanKeyValue(canonical: string, raw: string): CleanResult {
  let value = raw.trim();

  // Strip surrounding quotes (single, double, backtick)
  if (
    value.length >= 2 &&
    ((value[0] === '"' && value.at(-1) === '"') ||
      (value[0] === "'" && value.at(-1) === "'") ||
      (value[0] === "`" && value.at(-1) === "`"))
  ) {
    value = value.slice(1, -1).trim();
  }

  // Detect shell assignment syntax: KEY=value or export KEY=value
  const assignMatch = value.match(/^(?:export\s+)?[A-Z_]+=(.+)$/s);
  if (assignMatch) {
    value = assignMatch[1]!.trim();
    // Strip quotes again after extracting from assignment
    if (
      value.length >= 2 &&
      ((value[0] === '"' && value.at(-1) === '"') || (value[0] === "'" && value.at(-1) === "'"))
    ) {
      value = value.slice(1, -1).trim();
    }
  }

  if (!value) {
    return { value: "", warning: "Empty value" };
  }

  // Collect all matching providers, most specific (longest prefix) first
  const allMatches: { canonical: string; prefix: string }[] = [];
  for (const [key, prefixes] of Object.entries(KEY_PREFIXES)) {
    for (const p of prefixes) {
      if (value.startsWith(p)) allMatches.push({ canonical: key, prefix: p });
    }
  }
  allMatches.sort((a, b) => b.prefix.length - a.prefix.length);

  const ownPrefixes = KEY_PREFIXES[canonical];
  if (ownPrefixes && ownPrefixes.length > 0) {
    // If the most specific match belongs to a different provider, warn
    if (allMatches.length > 0 && allMatches[0]!.canonical !== canonical) {
      const otherKey = KNOWN_KEYS.find((k) => k.canonical === allMatches[0]!.canonical);
      const ownKey = KNOWN_KEYS.find((k) => k.canonical === canonical);
      return {
        value,
        warning: `This looks like a ${otherKey?.label ?? allMatches[0]!.canonical} key, not ${ownKey?.label ?? canonical}`,
      };
    }

    // No match at all for this provider's expected prefixes
    const matchesOwn = ownPrefixes.some((p) => value.startsWith(p));
    if (!matchesOwn) {
      const expected = ownPrefixes.join(" or ");
      return { value, warning: `Expected key starting with ${expected}` };
    }
  }

  return { value };
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

  function set(key: string, value: string): CleanResult {
    const normalized = canonicalKeyName(key);
    const cleaned = cleanKeyValue(normalized, value);
    if (!cleaned.value) return cleaned;

    sqlite
      .prepare(
        "INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      )
      .run(normalized, cleaned.value, Date.now());
    process.env[normalized] = cleaned.value;
    const alias = REVERSE_ALIASES[normalized];
    if (alias) process.env[alias] = cleaned.value;
    return cleaned;
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
      const v = row.value as string;
      if (process.env[k] === undefined) {
        process.env[k] = v;
      }
      // Also set aliases so both names are available immediately
      const alias = REVERSE_ALIASES[k];
      if (alias && process.env[alias] === undefined) {
        process.env[alias] = v;
      }
    }
  }

  function syncProviderKeys(): void {
    for (const known of KNOWN_KEYS) {
      // Check aliases first (user-facing names), then canonical
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

      // Ensure canonical env var reflects the resolved value
      process.env[known.canonical] = envVal;

      const dbVal = get(known.canonical);
      if (dbVal !== envVal) {
        sqlite
          .prepare(
            "INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
          )
          .run(known.canonical, envVal, Date.now());
      }
    }
  }

  return { get, set, delete: del, keys, loadIntoEnv, syncProviderKeys };
}
