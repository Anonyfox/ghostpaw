import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getSecret, initSecretsTable } from "../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { handleSecretsSet } from "./handle_set.ts";

let db: DatabaseHandle;

const ENV_KEYS = [
  "API_KEY_ANTHROPIC",
  "API_KEY_OPENAI",
  "API_KEY_XAI",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "XAI_API_KEY",
  "MY_TEST_KEY",
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

describe("handleSecretsSet", () => {
  it("stores a secret and returns success with canonical info", () => {
    const result = handleSecretsSet(db, "MY_TEST_KEY", "my-value");
    strictEqual(result.success, true);
    strictEqual(result.canonical, "MY_TEST_KEY");
    strictEqual(result.aliased, false);
    strictEqual(getSecret(db, "MY_TEST_KEY"), "my-value");
  });

  it("returns warning when prefix mismatches", () => {
    const result = handleSecretsSet(db, "API_KEY_ANTHROPIC", "sk-proj-wrong");
    strictEqual(result.success, true);
    ok(result.warning);
    ok(result.warning.includes("OpenAI"));
    strictEqual(getSecret(db, "API_KEY_ANTHROPIC"), "sk-proj-wrong");
  });

  it("returns error for empty value", () => {
    const result = handleSecretsSet(db, "MY_TEST_KEY", "   ");
    strictEqual(result.success, false);
    ok(result.error);
    strictEqual(getSecret(db, "MY_TEST_KEY"), null);
  });

  it("stores a key provided via alias and reports aliasing", () => {
    const result = handleSecretsSet(db, "ANTHROPIC_API_KEY", "sk-ant-test");
    strictEqual(result.success, true);
    strictEqual(result.canonical, "API_KEY_ANTHROPIC");
    strictEqual(result.aliased, true);
    strictEqual(getSecret(db, "API_KEY_ANTHROPIC"), "sk-ant-test");
  });

  it("does not report aliasing for canonical key names", () => {
    const result = handleSecretsSet(db, "API_KEY_ANTHROPIC", "sk-ant-test");
    strictEqual(result.aliased, false);
    strictEqual(result.canonical, "API_KEY_ANTHROPIC");
  });
});
