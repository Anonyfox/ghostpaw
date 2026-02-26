import { ok, strictEqual } from "node:assert/strict";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import { initSecretsTable, setSecret } from "../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { createListSecretsTool } from "./list_secrets.ts";

describe("list_secrets tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, never>) => Promise<unknown>;
  const savedEnv: Record<string, string | undefined> = {};
  const ENV_KEYS = ["API_KEY_ANTHROPIC", "ANTHROPIC_API_KEY", "BRAVE_API_KEY"];

  before(() => {
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  });

  beforeEach(async () => {
    for (const k of ENV_KEYS) delete process.env[k];
    db = await openTestDatabase();
    initSecretsTable(db);
    const tool = createListSecretsTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => {
    db.close();
    for (const k of ENV_KEYS) {
      if (savedEnv[k] !== undefined) process.env[k] = savedEnv[k];
      else delete process.env[k];
    }
  });

  it("returns all known keys with configured status when DB has secrets", async () => {
    setSecret(db, "ANTHROPIC_API_KEY", "sk-ant-test123");

    const result = (await execute({})) as { secrets: { key: string; configured: boolean }[] };
    ok(Array.isArray(result.secrets), "result has secrets array");

    const anthropic = result.secrets.find((s) => s.key === "API_KEY_ANTHROPIC");
    ok(anthropic, "Anthropic present");
    strictEqual(anthropic.configured, true);

    const openai = result.secrets.find((s) => s.key === "API_KEY_OPENAI");
    ok(openai, "OpenAI present");
    strictEqual(openai.configured, false);
  });

  it("returns all known keys as unconfigured when DB is empty", async () => {
    const result = (await execute({})) as { secrets: { configured: boolean }[] };
    const configured = result.secrets.filter((s) => s.configured);
    strictEqual(configured.length, 0, "none configured");
    ok(result.secrets.length >= 6, "at least 6 known keys returned");
  });

  it("includes custom keys from the database", async () => {
    setSecret(db, "MY_CUSTOM_TOKEN", "custom-value-123");

    const result = (await execute({})) as { secrets: { key: string; category: string }[] };
    const custom = result.secrets.find((s) => s.key === "MY_CUSTOM_TOKEN");
    ok(custom, "custom key present");
    strictEqual(custom.category, "custom");
  });

  it("never includes actual secret values in the result", async () => {
    setSecret(db, "ANTHROPIC_API_KEY", "sk-ant-supersecret");
    setSecret(db, "MY_TOKEN", "very-secret-value");

    const result = await execute({});
    const json = JSON.stringify(result);

    strictEqual(json.includes("sk-ant-supersecret"), false, "no Anthropic value leaked");
    strictEqual(json.includes("very-secret-value"), false, "no custom value leaked");
  });

  it("excludes WEB_UI_ prefixed keys from the result", async () => {
    db.prepare("INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?)").run(
      "WEB_UI_PASSWORD_HASH",
      "scrypt-hash",
      Date.now(),
    );

    const result = (await execute({})) as { secrets: { key: string }[] };
    const webUi = result.secrets.find((s) => s.key === "WEB_UI_PASSWORD_HASH");
    strictEqual(webUi, undefined, "WEB_UI_ key excluded");
  });

  it("marks the active search provider", async () => {
    setSecret(db, "BRAVE_API_KEY", "brave-key-123");

    const result = (await execute({})) as { secrets: { key: string; isActiveSearch: boolean }[] };
    const brave = result.secrets.find((s) => s.key === "BRAVE_API_KEY");
    strictEqual(brave?.isActiveSearch, true);

    const tavily = result.secrets.find((s) => s.key === "TAVILY_API_KEY");
    strictEqual(tavily?.isActiveSearch, false);
  });

  it("includes label and category for each key", async () => {
    const result = (await execute({})) as {
      secrets: { key: string; label: string; category: string }[];
    };
    const anthropic = result.secrets.find((s) => s.key === "API_KEY_ANTHROPIC");
    strictEqual(anthropic?.label, "Anthropic");
    strictEqual(anthropic?.category, "llm");

    const brave = result.secrets.find((s) => s.key === "BRAVE_API_KEY");
    strictEqual(brave?.label, "Brave Search");
    strictEqual(brave?.category, "search");
  });

  it("has a tool name and description", () => {
    const tool = createListSecretsTool(db);
    strictEqual(tool.name, "list_secrets");
    ok(tool.description.length > 20, "description is meaningful");
  });
});
