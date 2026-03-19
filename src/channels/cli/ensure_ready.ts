import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { KNOWN_KEYS, listStoredSecretKeys } from "../../core/secrets/api/read/index.ts";
import type { KnownKey } from "../../core/secrets/api/types.ts";
import { setManagedSecret } from "../../harness/public/settings/secrets.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { blank, log, readSecret, style } from "../../lib/terminal/index.ts";

const LLM_KEYS = KNOWN_KEYS.filter((k) => k.category === "llm");
const SEARCH_KEYS = KNOWN_KEYS.filter((k) => k.category === "search");

function hasAnyKey(db: DatabaseHandle, keys: KnownKey[]): boolean {
  const configured = new Set(listStoredSecretKeys(db));
  for (const k of keys) {
    if (configured.has(k.canonical)) return true;
    if (process.env[k.canonical]) return true;
    for (const alias of k.aliases) {
      if (process.env[alias]) return true;
    }
  }
  return false;
}

async function askKeyFromList(
  db: DatabaseHandle,
  keys: KnownKey[],
  skip?: string,
): Promise<boolean> {
  for (let i = 0; i < keys.length; i++) {
    console.log(`  ${style.bold(String(i + 1))}  ${keys[i]!.label}`);
  }
  if (skip) console.log(`  ${style.dim(skip)}`);

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const range = keys.length === 1 ? "[1]" : `[1-${keys.length}]`;
    const choice = await rl.question(`\n  Provider ${style.dim(range)}: `);
    const idx = Number.parseInt(choice.trim(), 10);
    if (!(idx >= 1 && idx <= keys.length)) return false;

    const provider = keys[idx - 1]!;
    rl.close();

    const key = await readSecret(`  ${provider.label} API key: `);
    if (!key.trim()) {
      blank();
      log.warn("empty key, skipping");
      return false;
    }

    const result = setManagedSecret(db, provider.canonical, key.trim());
    if (!result.success) {
      blank();
      log.warn(result.error ?? "empty value");
      return false;
    }
    if (result.warning) log.warn(result.warning);
    blank();
    log.done(`${provider.label} key stored`);
    return true;
  } finally {
    rl.close();
  }
}

/**
 * Detects missing essentials and guides the user through setup.
 * Called from the root command before channel/entity startup.
 * No-op when everything is already configured.
 */
export async function ensureReady(db: DatabaseHandle): Promise<void> {
  if (hasAnyKey(db, LLM_KEYS)) {
    if (!hasAnyKey(db, SEARCH_KEYS)) {
      log.info("no search provider configured (web search will use DuckDuckGo fallback)");
    }
    return;
  }

  if (!process.stdin.isTTY) {
    log.error("no API key configured");
    console.error("  Set an environment variable (e.g. ANTHROPIC_API_KEY)");
    console.error("  or run ghostpaw in a terminal for interactive setup.");
    process.exit(1);
  }

  blank();
  log.info("no API key found — let's set one up");
  blank();

  try {
    const stored = await askKeyFromList(db, LLM_KEYS);
    if (stored) {
    } else {
      log.error("an LLM API key is required to proceed");
      process.exit(1);
    }

    blank();
    log.info(`search provider ${style.dim("(optional — improves web search reliability)")}`);
    blank();

    const searchStored = await askKeyFromList(db, SEARCH_KEYS, "Enter to skip");
    if (searchStored) {
      // setSecret already syncs stored secrets into process.env
    }
  } catch {
    process.exit(0);
  }

  blank();
}
