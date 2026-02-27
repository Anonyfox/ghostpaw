import { ok, strictEqual } from "node:assert/strict";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import { initSecretsTable, listSecrets } from "../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSetSecretTool } from "./set_secret.ts";

describe("set_secret tool", () => {
  let db: DatabaseHandle;
  let execute: (args: { key: string; value: string }) => Promise<unknown>;
  const savedEnv: Record<string, string | undefined> = {};
  const ENV_KEYS = ["API_KEY_ANTHROPIC", "ANTHROPIC_API_KEY", "API_KEY_OPENAI", "OPENAI_API_KEY"];

  before(() => {
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  });

  beforeEach(async () => {
    for (const k of ENV_KEYS) delete process.env[k];
    db = await openTestDatabase();
    initSecretsTable(db);
    const tool = createSetSecretTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => {
    db.close();
    for (const k of ENV_KEYS) {
      if (savedEnv[k] !== undefined) process.env[k] = savedEnv[k];
      else delete process.env[k];
    }
  });

  it("stores a secret and returns the canonical key", async () => {
    const result = (await execute({ key: "ANTHROPIC_API_KEY", value: "sk-ant-test123" })) as {
      stored: string;
    };
    strictEqual(result.stored, "API_KEY_ANTHROPIC");

    const keys = listSecrets(db);
    ok(keys.includes("API_KEY_ANTHROPIC"), "key persisted in DB");
    strictEqual(process.env.API_KEY_ANTHROPIC, "sk-ant-test123");
  });

  it("returns a warning for mismatched key prefix", async () => {
    const result = (await execute({ key: "ANTHROPIC_API_KEY", value: "sk-openai-test" })) as {
      stored: string;
      warning: string;
    };
    strictEqual(result.stored, "API_KEY_ANTHROPIC");
    ok(result.warning, "warning is present");
  });

  it("never includes the secret value in the result", async () => {
    const result = await execute({ key: "API_KEY_OPENAI", value: "sk-supersecret-value" });
    const json = JSON.stringify(result);
    strictEqual(json.includes("sk-supersecret-value"), false, "value not in result");
  });

  it("stores custom user-defined keys", async () => {
    const result = (await execute({ key: "MY_CUSTOM_TOKEN", value: "tok-abc" })) as {
      stored: string;
    };
    strictEqual(result.stored, "MY_CUSTOM_TOKEN");
    strictEqual(process.env.MY_CUSTOM_TOKEN, "tok-abc");
  });

  it("returns error for empty key", async () => {
    const result = (await execute({ key: "", value: "test" })) as { error: string };
    ok(result.error, "error returned");
  });

  it("returns error for empty value", async () => {
    const result = (await execute({ key: "API_KEY_OPENAI", value: "   " })) as { error: string };
    ok(result.error, "error returned");
  });

  it("returns error for whitespace-only key", async () => {
    const result = (await execute({ key: "   ", value: "test" })) as { error: string };
    ok(result.error, "error returned");
  });

  it("rejects WEB_UI_ prefixed keys", async () => {
    const result = (await execute({ key: "WEB_UI_PASSWORD_HASH", value: "malicious" })) as {
      error: string;
    };
    ok(result.error.toLowerCase().includes("internal"), "error mentions internal");
    strictEqual(listSecrets(db).length, 0, "nothing stored");
  });

  it("rejects WEB_UI_ prefixed keys case-insensitively", async () => {
    const result = (await execute({ key: "web_ui_secret", value: "test" })) as { error: string };
    ok(result.error, "error returned");
  });

  it("updates an existing secret", async () => {
    await execute({ key: "API_KEY_OPENAI", value: "sk-old" });
    await execute({ key: "API_KEY_OPENAI", value: "sk-new" });
    strictEqual(process.env.API_KEY_OPENAI, "sk-new");
  });

  it("has a tool name and description", () => {
    const tool = createSetSecretTool(db);
    strictEqual(tool.name, "set_secret");
    ok(tool.description.length > 20, "description is meaningful");
    ok(tool.description.includes("NEVER"), "description warns about echoing values");
  });
});
