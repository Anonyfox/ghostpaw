import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { getSecret } from "./get_secret.ts";
import { initSecretsTable } from "./schema.ts";
import { setSecret } from "./set_secret.ts";

let db: DatabaseHandle;

const ENV_KEYS = [
  "API_KEY_ANTHROPIC",
  "API_KEY_OPENAI",
  "API_KEY_XAI",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "XAI_API_KEY",
  "TEST_SECRET",
  "MY_KEY",
  "TELEGRAM_TOKEN",
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

describe("setSecret", () => {
  it("stores a value and returns a clean result", () => {
    const r = setSecret(db, "MY_KEY", "my_value");
    strictEqual(r.value, "my_value");
    strictEqual(r.warning, undefined);
    strictEqual(getSecret(db, "MY_KEY"), "my_value");
  });

  it("also writes to process.env", () => {
    setSecret(db, "TEST_SECRET", "abc");
    strictEqual(process.env.TEST_SECRET, "abc");
  });

  it("sets both canonical and alias in process.env for LLM keys", () => {
    setSecret(db, "API_KEY_ANTHROPIC", "sk-ant-test");
    strictEqual(process.env.API_KEY_ANTHROPIC, "sk-ant-test");
    strictEqual(process.env.ANTHROPIC_API_KEY, "sk-ant-test");
  });

  it("normalizes alias to canonical before storing", () => {
    setSecret(db, "ANTHROPIC_API_KEY", "sk-ant-via-alias");
    strictEqual(getSecret(db, "API_KEY_ANTHROPIC"), "sk-ant-via-alias");
    strictEqual(process.env.API_KEY_ANTHROPIC, "sk-ant-via-alias");
    strictEqual(process.env.ANTHROPIC_API_KEY, "sk-ant-via-alias");
  });

  it("overwrites an existing value", () => {
    setSecret(db, "MY_KEY", "v1");
    setSecret(db, "MY_KEY", "v2");
    strictEqual(getSecret(db, "MY_KEY"), "v2");
    strictEqual(process.env.MY_KEY, "v2");
  });

  it("rejects empty value after cleaning (no DB write)", () => {
    const r = setSecret(db, "MY_KEY", '  ""  ');
    strictEqual(r.value, "");
    strictEqual(r.warning, "Empty value");
    strictEqual(getSecret(db, "MY_KEY"), null);
  });

  it("surfaces prefix warnings but still stores the value", () => {
    const r = setSecret(db, "API_KEY_ANTHROPIC", "sk-proj-wrong");
    ok(r.warning!.includes("OpenAI"));
    strictEqual(getSecret(db, "API_KEY_ANTHROPIC"), "sk-proj-wrong");
  });

  it("handles non-provider keys without alias behavior", () => {
    setSecret(db, "TELEGRAM_TOKEN", "tok123");
    strictEqual(getSecret(db, "TELEGRAM_TOKEN"), "tok123");
    strictEqual(process.env.TELEGRAM_TOKEN, "tok123");
  });
});
