import { deepStrictEqual, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createDatabase, type GhostpawDatabase } from "./database.js";
import { canonicalKeyName, createSecretStore, type SecretStore } from "./secrets.js";

let db: GhostpawDatabase;
let secrets: SecretStore;

const ENV_KEYS_TO_RESTORE = [
  "API_KEY_ANTHROPIC",
  "API_KEY_OPENAI",
  "API_KEY_XAI",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "XAI_API_KEY",
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

  it("passes through unknown keys unchanged", () => {
    strictEqual(canonicalKeyName("TELEGRAM_TOKEN"), "TELEGRAM_TOKEN");
    strictEqual(canonicalKeyName("API_KEY_ANTHROPIC"), "API_KEY_ANTHROPIC");
  });
});

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

describe("SecretStore - alias normalization", () => {
  it("set with alias name stores under canonical name", () => {
    secrets.set("ANTHROPIC_API_KEY", "sk-via-alias");
    strictEqual(secrets.get("API_KEY_ANTHROPIC"), "sk-via-alias");
    // Both env vars should be set
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

  it("non-provider keys pass through without alias behavior", () => {
    secrets.set("TELEGRAM_TOKEN", "tok123");
    strictEqual(secrets.get("TELEGRAM_TOKEN"), "tok123");
    strictEqual(process.env.TELEGRAM_TOKEN, "tok123");
    delete process.env.TELEGRAM_TOKEN;
  });
});

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
});

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

  it("updates DB when env var differs from stored value", () => {
    secrets.set("API_KEY_ANTHROPIC", "old-key");
    // Simulate key rotation: user updates BOTH env names (as bashrc reload would)
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
  });

  it("skips providers with empty string env var", () => {
    process.env.ANTHROPIC_API_KEY = "";

    secrets.syncProviderKeys();

    strictEqual(secrets.get("API_KEY_ANTHROPIC"), null);
  });

  it("alias takes precedence when both alias and canonical are set", () => {
    process.env.ANTHROPIC_API_KEY = "from-alias";
    process.env.API_KEY_ANTHROPIC = "from-canonical";

    secrets.syncProviderKeys();

    strictEqual(secrets.get("API_KEY_ANTHROPIC"), "from-alias");
  });
});

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
});
