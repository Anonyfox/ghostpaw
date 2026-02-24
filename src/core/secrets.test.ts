import { deepStrictEqual, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createDatabase, type GhostpawDatabase } from "./database.js";
import {
  activeSearchProvider,
  canonicalKeyName,
  cleanKeyValue,
  createSecretStore,
  KNOWN_KEYS,
  PROVIDER_ALIASES,
  type SecretStore,
} from "./secrets.js";

let db: GhostpawDatabase;
let secrets: SecretStore;

const ENV_KEYS_TO_RESTORE = [
  "API_KEY_ANTHROPIC",
  "API_KEY_OPENAI",
  "API_KEY_XAI",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "XAI_API_KEY",
  "BRAVE_API_KEY",
  "TAVILY_API_KEY",
  "SERPER_API_KEY",
  "TEST_SECRET",
];
let savedEnv: Record<string, string | undefined>;

beforeEach(async () => {
  db = await createDatabase(":memory:");
  secrets = createSecretStore(db);
  savedEnv = {};
  for (const k of ENV_KEYS_TO_RESTORE) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  db.close();
  for (const k of ENV_KEYS_TO_RESTORE) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

// ── KNOWN_KEYS registry ─────────────────────────────────────────────────────

describe("KNOWN_KEYS registry", () => {
  it("contains LLM providers", () => {
    const llm = KNOWN_KEYS.filter((k) => k.category === "llm");
    strictEqual(llm.length, 3);
    strictEqual(llm[0]!.label, "Anthropic");
  });

  it("contains search providers", () => {
    const search = KNOWN_KEYS.filter((k) => k.category === "search");
    strictEqual(search.length, 3);
    const labels = search.map((s) => s.label);
    deepStrictEqual(labels, ["Brave Search", "Tavily", "Serper"]);
  });

  it("PROVIDER_ALIASES is derived from KNOWN_KEYS", () => {
    strictEqual(PROVIDER_ALIASES.ANTHROPIC_API_KEY, "API_KEY_ANTHROPIC");
    strictEqual(PROVIDER_ALIASES.OPENAI_API_KEY, "API_KEY_OPENAI");
    strictEqual(PROVIDER_ALIASES.XAI_API_KEY, "API_KEY_XAI");
  });

  it("search keys have no aliases", () => {
    const search = KNOWN_KEYS.filter((k) => k.category === "search");
    for (const k of search) {
      strictEqual(k.aliases.length, 0);
    }
  });
});

// ── canonicalKeyName ────────────────────────────────────────────────────────

describe("canonicalKeyName", () => {
  it("maps ANTHROPIC_API_KEY to API_KEY_ANTHROPIC", () => {
    strictEqual(canonicalKeyName("ANTHROPIC_API_KEY"), "API_KEY_ANTHROPIC");
  });

  it("maps OPENAI_API_KEY to API_KEY_OPENAI", () => {
    strictEqual(canonicalKeyName("OPENAI_API_KEY"), "API_KEY_OPENAI");
  });

  it("maps XAI_API_KEY to API_KEY_XAI", () => {
    strictEqual(canonicalKeyName("XAI_API_KEY"), "API_KEY_XAI");
  });

  it("passes through search keys unchanged (no aliases)", () => {
    strictEqual(canonicalKeyName("BRAVE_API_KEY"), "BRAVE_API_KEY");
    strictEqual(canonicalKeyName("TAVILY_API_KEY"), "TAVILY_API_KEY");
    strictEqual(canonicalKeyName("SERPER_API_KEY"), "SERPER_API_KEY");
  });

  it("passes through unknown keys unchanged", () => {
    strictEqual(canonicalKeyName("TELEGRAM_TOKEN"), "TELEGRAM_TOKEN");
    strictEqual(canonicalKeyName("API_KEY_ANTHROPIC"), "API_KEY_ANTHROPIC");
  });
});

// ── SecretStore - basic operations ──────────────────────────────────────────

describe("SecretStore - basic operations", () => {
  it("get returns null for missing key", () => {
    strictEqual(secrets.get("NOPE"), null);
  });

  it("set + get round-trips", () => {
    secrets.set("MY_KEY", "my_value");
    strictEqual(secrets.get("MY_KEY"), "my_value");
  });

  it("set also writes to process.env", () => {
    secrets.set("TEST_SECRET", "abc");
    strictEqual(process.env.TEST_SECRET, "abc");
  });

  it("set overwrites existing value", () => {
    secrets.set("MY_KEY", "v1");
    secrets.set("MY_KEY", "v2");
    strictEqual(secrets.get("MY_KEY"), "v2");
    strictEqual(process.env.MY_KEY, "v2");
    delete process.env.MY_KEY;
  });

  it("delete removes from DB and process.env", () => {
    secrets.set("MY_KEY", "val");
    secrets.delete("MY_KEY");
    strictEqual(secrets.get("MY_KEY"), null);
    strictEqual(process.env.MY_KEY, undefined);
  });

  it("delete on missing key is a no-op", () => {
    secrets.delete("NOPE");
    strictEqual(secrets.get("NOPE"), null);
  });

  it("keys returns sorted key names", () => {
    secrets.set("B_KEY", "b");
    secrets.set("A_KEY", "a");
    secrets.set("C_KEY", "c");
    deepStrictEqual(secrets.keys(), ["A_KEY", "B_KEY", "C_KEY"]);
    delete process.env.A_KEY;
    delete process.env.B_KEY;
    delete process.env.C_KEY;
  });

  it("keys returns empty array when no secrets", () => {
    deepStrictEqual(secrets.keys(), []);
  });
});

// ── SecretStore - alias normalization ────────────────────────────────────────

describe("SecretStore - alias normalization", () => {
  it("set with alias name stores under canonical name", () => {
    secrets.set("ANTHROPIC_API_KEY", "sk-via-alias");
    strictEqual(secrets.get("API_KEY_ANTHROPIC"), "sk-via-alias");
    strictEqual(process.env.API_KEY_ANTHROPIC, "sk-via-alias");
    strictEqual(process.env.ANTHROPIC_API_KEY, "sk-via-alias");
  });

  it("get with alias name finds value stored under canonical", () => {
    secrets.set("API_KEY_OPENAI", "sk-stored-canonical");
    strictEqual(secrets.get("OPENAI_API_KEY"), "sk-stored-canonical");
  });

  it("delete with alias name removes canonical entry", () => {
    secrets.set("API_KEY_XAI", "xai-val");
    secrets.delete("XAI_API_KEY");
    strictEqual(secrets.get("API_KEY_XAI"), null);
    strictEqual(process.env.API_KEY_XAI, undefined);
    strictEqual(process.env.XAI_API_KEY, undefined);
  });

  it("set with canonical name also sets alias in env", () => {
    secrets.set("API_KEY_ANTHROPIC", "sk-canonical");
    strictEqual(process.env.ANTHROPIC_API_KEY, "sk-canonical");
  });

  it("search keys store directly (no alias behavior)", () => {
    secrets.set("TAVILY_API_KEY", "tvly-123");
    strictEqual(secrets.get("TAVILY_API_KEY"), "tvly-123");
    strictEqual(process.env.TAVILY_API_KEY, "tvly-123");
  });

  it("non-provider keys pass through without alias behavior", () => {
    secrets.set("TELEGRAM_TOKEN", "tok123");
    strictEqual(secrets.get("TELEGRAM_TOKEN"), "tok123");
    strictEqual(process.env.TELEGRAM_TOKEN, "tok123");
    delete process.env.TELEGRAM_TOKEN;
  });
});

// ── SecretStore - loadIntoEnv ───────────────────────────────────────────────

describe("SecretStore - loadIntoEnv", () => {
  it("populates process.env from DB", () => {
    secrets.set("TEST_SECRET", "from_db");
    delete process.env.TEST_SECRET;

    secrets.loadIntoEnv();
    strictEqual(process.env.TEST_SECRET, "from_db");
  });

  it("does not overwrite existing env vars", () => {
    secrets.set("TEST_SECRET", "from_db");
    process.env.TEST_SECRET = "from_shell";

    secrets.loadIntoEnv();
    strictEqual(process.env.TEST_SECRET, "from_shell");
  });

  it("does not overwrite explicitly empty env var", () => {
    secrets.set("TEST_SECRET", "from_db");
    process.env.TEST_SECRET = "";

    secrets.loadIntoEnv();
    strictEqual(process.env.TEST_SECRET, "");
  });

  it("loads multiple secrets", () => {
    secrets.set("API_KEY_ANTHROPIC", "ant-key");
    secrets.set("API_KEY_OPENAI", "oai-key");
    delete process.env.API_KEY_ANTHROPIC;
    delete process.env.API_KEY_OPENAI;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    secrets.loadIntoEnv();
    strictEqual(process.env.API_KEY_ANTHROPIC, "ant-key");
    strictEqual(process.env.API_KEY_OPENAI, "oai-key");
  });

  it("also sets aliases when loading from DB", () => {
    secrets.set("API_KEY_ANTHROPIC", "ant-key");
    delete process.env.API_KEY_ANTHROPIC;
    delete process.env.ANTHROPIC_API_KEY;

    secrets.loadIntoEnv();
    strictEqual(process.env.API_KEY_ANTHROPIC, "ant-key");
    strictEqual(process.env.ANTHROPIC_API_KEY, "ant-key");
  });

  it("does not overwrite existing alias env var", () => {
    secrets.set("API_KEY_ANTHROPIC", "from-db");
    delete process.env.API_KEY_ANTHROPIC;
    process.env.ANTHROPIC_API_KEY = "from-shell-alias";

    secrets.loadIntoEnv();
    strictEqual(process.env.API_KEY_ANTHROPIC, "from-db");
    strictEqual(process.env.ANTHROPIC_API_KEY, "from-shell-alias");
  });

  it("loads search keys into env", () => {
    secrets.set("TAVILY_API_KEY", "tvly-test");
    secrets.set("BRAVE_API_KEY", "brave-test");
    delete process.env.TAVILY_API_KEY;
    delete process.env.BRAVE_API_KEY;

    secrets.loadIntoEnv();
    strictEqual(process.env.TAVILY_API_KEY, "tvly-test");
    strictEqual(process.env.BRAVE_API_KEY, "brave-test");
  });
});

// ── SecretStore - syncProviderKeys ──────────────────────────────────────────

describe("SecretStore - syncProviderKeys", () => {
  it("syncs ANTHROPIC_API_KEY alias to API_KEY_ANTHROPIC", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-from-env";

    secrets.syncProviderKeys();

    strictEqual(process.env.API_KEY_ANTHROPIC, "sk-ant-from-env");
    strictEqual(secrets.get("API_KEY_ANTHROPIC"), "sk-ant-from-env");
  });

  it("syncs OPENAI_API_KEY alias to API_KEY_OPENAI", () => {
    process.env.OPENAI_API_KEY = "sk-oai-from-env";

    secrets.syncProviderKeys();

    strictEqual(process.env.API_KEY_OPENAI, "sk-oai-from-env");
    strictEqual(secrets.get("API_KEY_OPENAI"), "sk-oai-from-env");
  });

  it("syncs XAI_API_KEY alias to API_KEY_XAI", () => {
    process.env.XAI_API_KEY = "xai-from-env";

    secrets.syncProviderKeys();

    strictEqual(process.env.API_KEY_XAI, "xai-from-env");
    strictEqual(secrets.get("API_KEY_XAI"), "xai-from-env");
  });

  it("syncs direct chatoyant env var name", () => {
    process.env.API_KEY_ANTHROPIC = "sk-direct";

    secrets.syncProviderKeys();

    strictEqual(secrets.get("API_KEY_ANTHROPIC"), "sk-direct");
  });

  it("syncs TAVILY_API_KEY from env to DB", () => {
    process.env.TAVILY_API_KEY = "tvly-from-env";

    secrets.syncProviderKeys();

    strictEqual(secrets.get("TAVILY_API_KEY"), "tvly-from-env");
  });

  it("syncs BRAVE_API_KEY from env to DB", () => {
    process.env.BRAVE_API_KEY = "brave-from-env";

    secrets.syncProviderKeys();

    strictEqual(secrets.get("BRAVE_API_KEY"), "brave-from-env");
  });

  it("syncs SERPER_API_KEY from env to DB", () => {
    process.env.SERPER_API_KEY = "serper-from-env";

    secrets.syncProviderKeys();

    strictEqual(secrets.get("SERPER_API_KEY"), "serper-from-env");
  });

  it("updates DB when env var differs from stored value", () => {
    secrets.set("API_KEY_ANTHROPIC", "old-key");
    process.env.API_KEY_ANTHROPIC = "new-key";
    process.env.ANTHROPIC_API_KEY = "new-key";

    secrets.syncProviderKeys();

    strictEqual(secrets.get("API_KEY_ANTHROPIC"), "new-key");
  });

  it("does not write to DB when values match", () => {
    secrets.set("API_KEY_ANTHROPIC", "same-key");
    process.env.API_KEY_ANTHROPIC = "same-key";

    secrets.syncProviderKeys();

    strictEqual(secrets.get("API_KEY_ANTHROPIC"), "same-key");
  });

  it("skips providers with no env var set", () => {
    secrets.syncProviderKeys();

    strictEqual(secrets.get("API_KEY_ANTHROPIC"), null);
    strictEqual(secrets.get("API_KEY_OPENAI"), null);
    strictEqual(secrets.get("API_KEY_XAI"), null);
    strictEqual(secrets.get("TAVILY_API_KEY"), null);
    strictEqual(secrets.get("BRAVE_API_KEY"), null);
    strictEqual(secrets.get("SERPER_API_KEY"), null);
  });

  it("skips providers with empty string env var", () => {
    process.env.ANTHROPIC_API_KEY = "";
    process.env.TAVILY_API_KEY = "";

    secrets.syncProviderKeys();

    strictEqual(secrets.get("API_KEY_ANTHROPIC"), null);
    strictEqual(secrets.get("TAVILY_API_KEY"), null);
  });

  it("alias takes precedence when both alias and canonical are set", () => {
    process.env.ANTHROPIC_API_KEY = "from-alias";
    process.env.API_KEY_ANTHROPIC = "from-canonical";

    secrets.syncProviderKeys();

    strictEqual(secrets.get("API_KEY_ANTHROPIC"), "from-alias");
  });

  it("updates search key in DB when env value changes", () => {
    secrets.set("TAVILY_API_KEY", "old-tavily");
    process.env.TAVILY_API_KEY = "new-tavily";

    secrets.syncProviderKeys();

    strictEqual(secrets.get("TAVILY_API_KEY"), "new-tavily");
  });
});

// ── Full startup flow ───────────────────────────────────────────────────────

describe("SecretStore - full startup flow", () => {
  it("loadIntoEnv then syncProviderKeys handles typical VPS setup", () => {
    secrets.set("API_KEY_ANTHROPIC", "stored-key");
    delete process.env.API_KEY_ANTHROPIC;
    delete process.env.ANTHROPIC_API_KEY;

    secrets.loadIntoEnv();
    secrets.syncProviderKeys();

    strictEqual(process.env.API_KEY_ANTHROPIC, "stored-key");
  });

  it("env var override updates DB during sync", () => {
    secrets.set("API_KEY_ANTHROPIC", "old-key");
    delete process.env.API_KEY_ANTHROPIC;
    delete process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "rotated-key";

    secrets.loadIntoEnv();
    secrets.syncProviderKeys();

    strictEqual(process.env.API_KEY_ANTHROPIC, "rotated-key");
    strictEqual(secrets.get("API_KEY_ANTHROPIC"), "rotated-key");
  });

  it("non-provider env vars do not auto-persist", () => {
    process.env.SOME_CI_TOKEN = "ci-only";

    secrets.loadIntoEnv();
    secrets.syncProviderKeys();

    strictEqual(secrets.get("SOME_CI_TOKEN"), null);
    delete process.env.SOME_CI_TOKEN;
  });

  it("search key set via env persists through full startup flow", () => {
    process.env.TAVILY_API_KEY = "tvly-env";

    secrets.loadIntoEnv();
    secrets.syncProviderKeys();

    strictEqual(secrets.get("TAVILY_API_KEY"), "tvly-env");

    // Simulate restart: clear env, reload from DB
    delete process.env.TAVILY_API_KEY;
    secrets.loadIntoEnv();
    strictEqual(process.env.TAVILY_API_KEY, "tvly-env");
  });

  it("multiple search keys persist independently", () => {
    process.env.BRAVE_API_KEY = "brave-key";
    process.env.TAVILY_API_KEY = "tavily-key";

    secrets.syncProviderKeys();

    strictEqual(secrets.get("BRAVE_API_KEY"), "brave-key");
    strictEqual(secrets.get("TAVILY_API_KEY"), "tavily-key");

    // Simulate restart
    delete process.env.BRAVE_API_KEY;
    delete process.env.TAVILY_API_KEY;
    secrets.loadIntoEnv();
    strictEqual(process.env.BRAVE_API_KEY, "brave-key");
    strictEqual(process.env.TAVILY_API_KEY, "tavily-key");
  });

  it("LLM aliases are available after loadIntoEnv without syncProviderKeys", () => {
    secrets.set("API_KEY_ANTHROPIC", "ant-key");
    delete process.env.API_KEY_ANTHROPIC;
    delete process.env.ANTHROPIC_API_KEY;

    secrets.loadIntoEnv();

    strictEqual(process.env.ANTHROPIC_API_KEY, "ant-key");
  });
});

// ── cleanKeyValue ───────────────────────────────────────────────────────────

describe("cleanKeyValue", () => {
  it("trims whitespace", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", "  tvly-abc123  ");
    strictEqual(r.value, "tvly-abc123");
    strictEqual(r.warning, undefined);
  });

  it("strips double quotes", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", '"tvly-abc123"');
    strictEqual(r.value, "tvly-abc123");
    strictEqual(r.warning, undefined);
  });

  it("strips single quotes", () => {
    const r = cleanKeyValue("BRAVE_API_KEY", "'BSAtest123'");
    strictEqual(r.value, "BSAtest123");
    strictEqual(r.warning, undefined);
  });

  it("strips backtick quotes", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", "`tvly-key`");
    strictEqual(r.value, "tvly-key");
  });

  it("extracts value from KEY=value assignment", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", "TAVILY_API_KEY=tvly-abc123");
    strictEqual(r.value, "tvly-abc123");
    strictEqual(r.warning, undefined);
  });

  it("extracts value from export KEY=value", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", 'export TAVILY_API_KEY="tvly-abc123"');
    strictEqual(r.value, "tvly-abc123");
    strictEqual(r.warning, undefined);
  });

  it("extracts value from export KEY=value with single quotes", () => {
    const r = cleanKeyValue("BRAVE_API_KEY", "export BRAVE_API_KEY='BSAtest'");
    strictEqual(r.value, "BSAtest");
    strictEqual(r.warning, undefined);
  });

  it("returns warning for empty value", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", "  ");
    strictEqual(r.value, "");
    strictEqual(r.warning, "Empty value");
  });

  it("returns warning for wrong prefix (Anthropic slot, OpenAI key)", () => {
    const r = cleanKeyValue("API_KEY_ANTHROPIC", "sk-proj-abc123");
    strictEqual(r.value, "sk-proj-abc123");
    strictEqual(r.warning!.includes("OpenAI"), true);
  });

  it("accepts valid Anthropic prefix", () => {
    const r = cleanKeyValue("API_KEY_ANTHROPIC", "sk-ant-abc123");
    strictEqual(r.value, "sk-ant-abc123");
    strictEqual(r.warning, undefined);
  });

  it("accepts valid OpenAI prefix", () => {
    const r = cleanKeyValue("API_KEY_OPENAI", "sk-proj-abc123");
    strictEqual(r.value, "sk-proj-abc123");
    strictEqual(r.warning, undefined);
  });

  it("detects Anthropic key placed in OpenAI slot (most specific prefix wins)", () => {
    const r = cleanKeyValue("API_KEY_OPENAI", "sk-ant-abc123");
    strictEqual(r.value, "sk-ant-abc123");
    strictEqual(r.warning !== undefined, true);
    strictEqual(r.warning!.includes("Anthropic"), true);
  });

  it("detects OpenAI key placed in xAI slot", () => {
    const r = cleanKeyValue("API_KEY_XAI", "sk-abc123");
    strictEqual(r.value, "sk-abc123");
    strictEqual(r.warning!.includes("OpenAI"), true);
  });

  it("warns on invalid Brave prefix", () => {
    const r = cleanKeyValue("BRAVE_API_KEY", "tvly-wrong");
    strictEqual(r.value, "tvly-wrong");
    strictEqual(r.warning!.includes("Tavily"), true);
  });

  it("warns on invalid Tavily prefix", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", "BSAnot-tavily");
    strictEqual(r.value, "BSAnot-tavily");
    strictEqual(r.warning!.includes("Brave"), true);
  });

  it("no prefix validation for Serper (unknown format)", () => {
    const r = cleanKeyValue("SERPER_API_KEY", "any-format-key");
    strictEqual(r.value, "any-format-key");
    strictEqual(r.warning, undefined);
  });

  it("no prefix validation for unknown keys", () => {
    const r = cleanKeyValue("CUSTOM_KEY", "whatever-value");
    strictEqual(r.value, "whatever-value");
    strictEqual(r.warning, undefined);
  });

  it("accepts valid xAI prefix", () => {
    const r = cleanKeyValue("API_KEY_XAI", "xai-abc123");
    strictEqual(r.value, "xai-abc123");
    strictEqual(r.warning, undefined);
  });

  it("accepts valid Brave prefix", () => {
    const r = cleanKeyValue("BRAVE_API_KEY", "BSAabc123");
    strictEqual(r.value, "BSAabc123");
    strictEqual(r.warning, undefined);
  });

  it("accepts valid Tavily prefix", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", "tvly-abc123");
    strictEqual(r.value, "tvly-abc123");
    strictEqual(r.warning, undefined);
  });

  it("handles set returning validation result", () => {
    const result = secrets.set("TAVILY_API_KEY", '  "tvly-clean"  ');
    strictEqual(result.value, "tvly-clean");
    strictEqual(result.warning, undefined);
    strictEqual(secrets.get("TAVILY_API_KEY"), "tvly-clean");
  });

  it("set rejects empty after cleaning", () => {
    const result = secrets.set("TAVILY_API_KEY", '  ""  ');
    strictEqual(result.value, "");
    strictEqual(result.warning, "Empty value");
    strictEqual(secrets.get("TAVILY_API_KEY"), null);
  });

  it("set surfaces prefix warnings", () => {
    const result = secrets.set("API_KEY_ANTHROPIC", "sk-proj-wrong-provider");
    strictEqual(result.value, "sk-proj-wrong-provider");
    strictEqual(result.warning!.includes("OpenAI"), true);
    strictEqual(secrets.get("API_KEY_ANTHROPIC"), "sk-proj-wrong-provider");
  });
});

// ── activeSearchProvider ────────────────────────────────────────────────────

describe("activeSearchProvider", () => {
  it("returns null when no search keys are set", () => {
    strictEqual(activeSearchProvider(), null);
  });

  it("returns Brave when BRAVE_API_KEY is set", () => {
    process.env.BRAVE_API_KEY = "BSAtest";
    const result = activeSearchProvider();
    strictEqual(result?.canonical, "BRAVE_API_KEY");
    strictEqual(result?.label, "Brave Search");
  });

  it("returns Tavily when TAVILY_API_KEY is set", () => {
    process.env.TAVILY_API_KEY = "tvly-test";
    const result = activeSearchProvider();
    strictEqual(result?.canonical, "TAVILY_API_KEY");
  });

  it("returns Serper when SERPER_API_KEY is set", () => {
    process.env.SERPER_API_KEY = "serp-test";
    const result = activeSearchProvider();
    strictEqual(result?.canonical, "SERPER_API_KEY");
  });

  it("Brave takes priority over Tavily", () => {
    process.env.BRAVE_API_KEY = "BSAtest";
    process.env.TAVILY_API_KEY = "tvly-test";
    const result = activeSearchProvider();
    strictEqual(result?.canonical, "BRAVE_API_KEY");
  });

  it("Tavily takes priority over Serper", () => {
    process.env.TAVILY_API_KEY = "tvly-test";
    process.env.SERPER_API_KEY = "serp-test";
    const result = activeSearchProvider();
    strictEqual(result?.canonical, "TAVILY_API_KEY");
  });

  it("Brave takes priority over all others", () => {
    process.env.BRAVE_API_KEY = "BSAtest";
    process.env.TAVILY_API_KEY = "tvly-test";
    process.env.SERPER_API_KEY = "serp-test";
    const result = activeSearchProvider();
    strictEqual(result?.canonical, "BRAVE_API_KEY");
  });
});
