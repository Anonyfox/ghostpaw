import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { getSecret } from "./get_secret.ts";
import { loadSecretsIntoEnv } from "./load_secrets_into_env.ts";
import { initSecretsTable } from "./schema.ts";
import { setSecret } from "./set_secret.ts";
import { syncProviderKeys } from "./sync_provider_keys.ts";

let db: DatabaseHandle;

const ENV_KEYS = [
  "API_KEY_ANTHROPIC",
  "API_KEY_OPENAI",
  "API_KEY_XAI",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "XAI_API_KEY",
  "BRAVE_API_KEY",
  "TAVILY_API_KEY",
  "SERPER_API_KEY",
  "SOME_CI_TOKEN",
];
let savedEnv: Record<string, string | undefined>;

beforeEach(async () => {
  db = await openTestDatabase();
  initSecretsTable(db);
  savedEnv = {};
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  db.close();
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("syncProviderKeys", () => {
  it("writes alias env var to DB under canonical name", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-from-env";

    syncProviderKeys(db);
    strictEqual(process.env.API_KEY_ANTHROPIC, "sk-ant-from-env");
    strictEqual(getSecret(db, "API_KEY_ANTHROPIC"), "sk-ant-from-env");
  });

  it("writes canonical env var to DB", () => {
    process.env.API_KEY_ANTHROPIC = "sk-direct";

    syncProviderKeys(db);
    strictEqual(getSecret(db, "API_KEY_ANTHROPIC"), "sk-direct");
  });

  it("writes search key env var to DB", () => {
    process.env.TAVILY_API_KEY = "tvly-from-env";

    syncProviderKeys(db);
    strictEqual(getSecret(db, "TAVILY_API_KEY"), "tvly-from-env");
  });

  it("updates DB when env var differs from stored value", () => {
    setSecret(db, "API_KEY_ANTHROPIC", "old-key");
    process.env.API_KEY_ANTHROPIC = "new-key";
    process.env.ANTHROPIC_API_KEY = "new-key";

    syncProviderKeys(db);
    strictEqual(getSecret(db, "API_KEY_ANTHROPIC"), "new-key");
  });

  it("does not write to DB when values match", () => {
    setSecret(db, "API_KEY_ANTHROPIC", "same-key");
    process.env.API_KEY_ANTHROPIC = "same-key";

    syncProviderKeys(db);
    strictEqual(getSecret(db, "API_KEY_ANTHROPIC"), "same-key");
  });

  it("skips providers with no env var set", () => {
    syncProviderKeys(db);
    strictEqual(getSecret(db, "API_KEY_ANTHROPIC"), null);
    strictEqual(getSecret(db, "TAVILY_API_KEY"), null);
  });

  it("skips providers with empty string env var", () => {
    process.env.ANTHROPIC_API_KEY = "";
    process.env.TAVILY_API_KEY = "";

    syncProviderKeys(db);
    strictEqual(getSecret(db, "API_KEY_ANTHROPIC"), null);
    strictEqual(getSecret(db, "TAVILY_API_KEY"), null);
  });

  it("alias takes precedence when both alias and canonical are set", () => {
    process.env.ANTHROPIC_API_KEY = "from-alias";
    process.env.API_KEY_ANTHROPIC = "from-canonical";

    syncProviderKeys(db);
    strictEqual(getSecret(db, "API_KEY_ANTHROPIC"), "from-alias");
  });
});

describe("full startup flow", () => {
  it("loadSecretsIntoEnv then syncProviderKeys handles typical VPS setup", () => {
    setSecret(db, "API_KEY_ANTHROPIC", "stored-key");
    delete process.env.API_KEY_ANTHROPIC;
    delete process.env.ANTHROPIC_API_KEY;

    loadSecretsIntoEnv(db);
    syncProviderKeys(db);
    strictEqual(process.env.API_KEY_ANTHROPIC, "stored-key");
  });

  it("env var override updates DB during sync", () => {
    setSecret(db, "API_KEY_ANTHROPIC", "old-key");
    delete process.env.API_KEY_ANTHROPIC;
    delete process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "rotated-key";

    loadSecretsIntoEnv(db);
    syncProviderKeys(db);
    strictEqual(process.env.API_KEY_ANTHROPIC, "rotated-key");
    strictEqual(getSecret(db, "API_KEY_ANTHROPIC"), "rotated-key");
  });

  it("non-provider env vars do not auto-persist", () => {
    process.env.SOME_CI_TOKEN = "ci-only";

    loadSecretsIntoEnv(db);
    syncProviderKeys(db);
    strictEqual(getSecret(db, "SOME_CI_TOKEN"), null);
  });

  it("search key persists through simulated restart", () => {
    process.env.TAVILY_API_KEY = "tvly-env";

    loadSecretsIntoEnv(db);
    syncProviderKeys(db);
    strictEqual(getSecret(db, "TAVILY_API_KEY"), "tvly-env");

    delete process.env.TAVILY_API_KEY;
    loadSecretsIntoEnv(db);
    strictEqual(process.env.TAVILY_API_KEY, "tvly-env");
  });
});
