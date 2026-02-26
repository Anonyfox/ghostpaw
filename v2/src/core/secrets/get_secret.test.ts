import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { getSecret } from "./get_secret.ts";
import { initSecretsTable } from "./schema.ts";
import { setSecret } from "./set_secret.ts";

let db: DatabaseHandle;

const ENV_KEYS = ["API_KEY_OPENAI", "OPENAI_API_KEY", "MY_KEY"];
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

describe("getSecret", () => {
  it("returns null for a missing key", () => {
    strictEqual(getSecret(db, "NOPE"), null);
  });

  it("returns the stored value after setSecret", () => {
    setSecret(db, "MY_KEY", "my_value");
    strictEqual(getSecret(db, "MY_KEY"), "my_value");
  });

  it("resolves aliases to canonical before lookup", () => {
    setSecret(db, "API_KEY_OPENAI", "sk-stored");
    strictEqual(getSecret(db, "OPENAI_API_KEY"), "sk-stored");
  });
});
