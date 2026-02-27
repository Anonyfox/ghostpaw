import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getSecret, initSecretsTable, setSecret } from "../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { handleSecretsDelete } from "./handle_delete.ts";

let db: DatabaseHandle;

const ENV_KEYS = ["API_KEY_ANTHROPIC", "ANTHROPIC_API_KEY", "MY_TEST_KEY"];
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

describe("handleSecretsDelete", () => {
  it("deletes an existing secret and returns true", () => {
    setSecret(db, "MY_TEST_KEY", "val");
    const existed = handleSecretsDelete(db, "MY_TEST_KEY");
    strictEqual(existed, true);
    strictEqual(getSecret(db, "MY_TEST_KEY"), null);
  });

  it("returns false for a missing key", () => {
    const existed = handleSecretsDelete(db, "NOPE");
    strictEqual(existed, false);
    strictEqual(getSecret(db, "NOPE"), null);
  });

  it("handles alias key and deletes canonical", () => {
    setSecret(db, "ANTHROPIC_API_KEY", "sk-ant-test");
    const existed = handleSecretsDelete(db, "ANTHROPIC_API_KEY");
    strictEqual(existed, true);
    strictEqual(getSecret(db, "API_KEY_ANTHROPIC"), null);
  });
});
