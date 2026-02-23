import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createDatabase, type GhostpawDatabase } from "../core/database.js";
import { createSecretStore, type SecretStore } from "../core/secrets.js";
import { createSecretsTool } from "./secrets.js";

let db: GhostpawDatabase;
let secrets: SecretStore;

async function exec(
  tool: ReturnType<typeof createSecretsTool>,
  args: Record<string, unknown>,
) {
  return tool.execute({ args } as Parameters<ReturnType<typeof createSecretsTool>["execute"]>[0]);
}

beforeEach(async () => {
  db = await createDatabase(":memory:");
  secrets = createSecretStore(db);
});

afterEach(() => {
  db.close();
  delete process.env.MY_TOKEN;
  delete process.env.OTHER_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.API_KEY_ANTHROPIC;
});

describe("secrets tool - metadata", () => {
  it("has correct name and description", () => {
    const tool = createSecretsTool(secrets);
    strictEqual(tool.name, "secrets");
    ok(tool.description.includes("secret"));
  });
});

describe("secrets tool - list", () => {
  it("returns empty array initially", async () => {
    const tool = createSecretsTool(secrets);
    const result = (await exec(tool, { action: "list" })) as { keys: string[] };
    deepStrictEqual(result.keys, []);
  });

  it("returns key names after set", async () => {
    secrets.set("MY_TOKEN", "val1");
    secrets.set("OTHER_KEY", "val2");

    const tool = createSecretsTool(secrets);
    const result = (await exec(tool, { action: "list" })) as { keys: string[] };
    deepStrictEqual(result.keys, ["MY_TOKEN", "OTHER_KEY"]);
  });
});

describe("secrets tool - set", () => {
  it("stores a secret", async () => {
    const tool = createSecretsTool(secrets);
    const result = (await exec(tool, { action: "set", key: "MY_TOKEN", value: "abc" })) as {
      stored: string;
    };
    strictEqual(result.stored, "MY_TOKEN");
    strictEqual(secrets.get("MY_TOKEN"), "abc");
  });

  it("returns error if key missing", async () => {
    const tool = createSecretsTool(secrets);
    const result = (await exec(tool, { action: "set", value: "abc" })) as { error: string };
    ok(result.error.includes("key"));
  });

  it("returns error if value missing", async () => {
    const tool = createSecretsTool(secrets);
    const result = (await exec(tool, { action: "set", key: "MY_TOKEN" })) as { error: string };
    ok(result.error.includes("value"));
  });
});

describe("secrets tool - delete", () => {
  it("removes a stored secret", async () => {
    secrets.set("MY_TOKEN", "abc");

    const tool = createSecretsTool(secrets);
    const result = (await exec(tool, { action: "delete", key: "MY_TOKEN" })) as {
      deleted: string;
    };
    strictEqual(result.deleted, "MY_TOKEN");
    strictEqual(secrets.get("MY_TOKEN"), null);
  });

  it("returns error if key missing", async () => {
    const tool = createSecretsTool(secrets);
    const result = (await exec(tool, { action: "delete" })) as { error: string };
    ok(result.error.includes("key"));
  });

  it("handles deleting non-existent key gracefully", async () => {
    const tool = createSecretsTool(secrets);
    const result = (await exec(tool, { action: "delete", key: "NOPE" })) as { deleted: string };
    strictEqual(result.deleted, "NOPE");
  });
});

describe("secrets tool - alias normalization", () => {
  it("set with user alias stores under canonical name", async () => {
    const tool = createSecretsTool(secrets);
    const result = (await exec(tool, {
      action: "set",
      key: "ANTHROPIC_API_KEY",
      value: "sk-via-agent",
    })) as { stored: string };
    strictEqual(result.stored, "ANTHROPIC_API_KEY");
    strictEqual(secrets.get("API_KEY_ANTHROPIC"), "sk-via-agent");
    strictEqual(process.env.API_KEY_ANTHROPIC, "sk-via-agent");
  });

  it("delete with user alias removes canonical entry", async () => {
    secrets.set("API_KEY_ANTHROPIC", "sk-existing");
    const tool = createSecretsTool(secrets);
    await exec(tool, { action: "delete", key: "ANTHROPIC_API_KEY" });
    strictEqual(secrets.get("API_KEY_ANTHROPIC"), null);
  });
});
