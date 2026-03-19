import { ok, strictEqual } from "node:assert/strict";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import { listStoredSecretKeys } from "../../core/secrets/api/read/index.ts";
import { setSecret } from "../../core/secrets/api/write/index.ts";
import { initSecretsTable } from "../../core/secrets/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createRemoveSecretTool } from "./remove_secret.ts";

describe("remove_secret tool", () => {
  let db: DatabaseHandle;
  let execute: (args: { key: string }) => Promise<unknown>;
  const savedEnv: Record<string, string | undefined> = {};
  const ENV_KEYS = ["API_KEY_ANTHROPIC", "ANTHROPIC_API_KEY", "BRAVE_API_KEY"];

  before(() => {
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  });

  beforeEach(async () => {
    for (const k of ENV_KEYS) delete process.env[k];
    db = await openTestDatabase();
    initSecretsTable(db);
    const tool = createRemoveSecretTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => {
    db.close();
    for (const k of ENV_KEYS) {
      if (savedEnv[k] !== undefined) process.env[k] = savedEnv[k];
      else delete process.env[k];
    }
  });

  it("removes an existing secret and returns the canonical key", async () => {
    setSecret(db, "ANTHROPIC_API_KEY", "sk-ant-test");

    const result = (await execute({ key: "API_KEY_ANTHROPIC" })) as { removed: string };
    strictEqual(result.removed, "API_KEY_ANTHROPIC");
    strictEqual(
      listStoredSecretKeys(db).includes("API_KEY_ANTHROPIC"),
      false,
      "key removed from DB",
    );
    strictEqual(process.env.API_KEY_ANTHROPIC, undefined, "env var cleared");
  });

  it("accepts alias names and canonicalizes them", async () => {
    setSecret(db, "BRAVE_API_KEY", "brave-test");

    const result = (await execute({ key: "BRAVE_API_KEY" })) as { removed: string };
    strictEqual(result.removed, "BRAVE_API_KEY");
    strictEqual(process.env.BRAVE_API_KEY, undefined);
  });

  it("succeeds silently for non-existent keys", async () => {
    const result = (await execute({ key: "NONEXISTENT_KEY" })) as { removed: string };
    strictEqual(result.removed, "NONEXISTENT_KEY");
  });

  it("rejects WEB_UI_ prefixed keys", async () => {
    db.prepare("INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?)").run(
      "WEB_UI_PASSWORD_HASH",
      "real-hash",
      Date.now(),
    );

    const result = (await execute({ key: "WEB_UI_PASSWORD_HASH" })) as { error: string };
    ok(result.error.toLowerCase().includes("internal"), "error mentions internal");

    const row = db.prepare("SELECT * FROM secrets WHERE key = ?").get("WEB_UI_PASSWORD_HASH");
    ok(row, "WEB_UI_ key was NOT deleted");
  });

  it("rejects WEB_UI_ prefixed keys case-insensitively", async () => {
    const result = (await execute({ key: "web_ui_token" })) as { error: string };
    ok(result.error, "error returned");
  });

  it("returns error for empty key", async () => {
    const result = (await execute({ key: "" })) as { error: string };
    ok(result.error, "error returned");
  });

  it("returns error for whitespace-only key", async () => {
    const result = (await execute({ key: "   " })) as { error: string };
    ok(result.error, "error returned");
  });

  it("has a tool name and description", () => {
    const tool = createRemoveSecretTool(db);
    strictEqual(tool.name, "remove_secret");
    ok(tool.description.length > 20, "description is meaningful");
  });
});
