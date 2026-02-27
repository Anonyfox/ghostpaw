import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { loadSecretsIntoEnv } from "./load_secrets_into_env.ts";
import { initSecretsTable } from "./schema.ts";
import { setSecret } from "./set_secret.ts";

let db: DatabaseHandle;

const ENV_KEYS = [
  "API_KEY_ANTHROPIC",
  "API_KEY_OPENAI",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "BRAVE_API_KEY",
  "TAVILY_API_KEY",
  "TEST_SECRET",
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

describe("loadSecretsIntoEnv", () => {
  it("populates process.env from DB", () => {
    setSecret(db, "TEST_SECRET", "from_db");
    delete process.env.TEST_SECRET;

    loadSecretsIntoEnv(db);
    strictEqual(process.env.TEST_SECRET, "from_db");
  });

  it("does not overwrite existing env vars", () => {
    setSecret(db, "TEST_SECRET", "from_db");
    process.env.TEST_SECRET = "from_shell";

    loadSecretsIntoEnv(db);
    strictEqual(process.env.TEST_SECRET, "from_shell");
  });

  it("does not overwrite explicitly empty env var", () => {
    setSecret(db, "TEST_SECRET", "from_db");
    process.env.TEST_SECRET = "";

    loadSecretsIntoEnv(db);
    strictEqual(process.env.TEST_SECRET, "");
  });

  it("loads multiple secrets", () => {
    setSecret(db, "API_KEY_ANTHROPIC", "ant-key");
    setSecret(db, "API_KEY_OPENAI", "oai-key");
    delete process.env.API_KEY_ANTHROPIC;
    delete process.env.API_KEY_OPENAI;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    loadSecretsIntoEnv(db);
    strictEqual(process.env.API_KEY_ANTHROPIC, "ant-key");
    strictEqual(process.env.API_KEY_OPENAI, "oai-key");
  });

  it("also sets aliases when loading from DB", () => {
    setSecret(db, "API_KEY_ANTHROPIC", "ant-key");
    delete process.env.API_KEY_ANTHROPIC;
    delete process.env.ANTHROPIC_API_KEY;

    loadSecretsIntoEnv(db);
    strictEqual(process.env.ANTHROPIC_API_KEY, "ant-key");
  });

  it("does not overwrite existing alias env var", () => {
    setSecret(db, "API_KEY_ANTHROPIC", "from-db");
    delete process.env.API_KEY_ANTHROPIC;
    process.env.ANTHROPIC_API_KEY = "from-shell-alias";

    loadSecretsIntoEnv(db);
    strictEqual(process.env.API_KEY_ANTHROPIC, "from-db");
    strictEqual(process.env.ANTHROPIC_API_KEY, "from-shell-alias");
  });

  it("loads search keys into env", () => {
    setSecret(db, "TAVILY_API_KEY", "tvly-test");
    setSecret(db, "BRAVE_API_KEY", "brave-test");
    delete process.env.TAVILY_API_KEY;
    delete process.env.BRAVE_API_KEY;

    loadSecretsIntoEnv(db);
    strictEqual(process.env.TAVILY_API_KEY, "tvly-test");
    strictEqual(process.env.BRAVE_API_KEY, "brave-test");
  });
});
