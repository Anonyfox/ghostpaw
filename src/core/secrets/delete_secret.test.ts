import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { deleteSecret } from "./delete_secret.ts";
import { getSecret } from "./get_secret.ts";
import { initSecretsTable } from "./schema.ts";
import { setSecret } from "./set_secret.ts";

let db: DatabaseHandle;

const ENV_KEYS = ["API_KEY_XAI", "XAI_API_KEY", "MY_KEY"];
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

describe("deleteSecret", () => {
  it("removes from DB and process.env", () => {
    setSecret(db, "MY_KEY", "val");
    deleteSecret(db, "MY_KEY");
    strictEqual(getSecret(db, "MY_KEY"), null);
    strictEqual(process.env.MY_KEY, undefined);
  });

  it("removes both canonical and alias from env for LLM keys", () => {
    setSecret(db, "API_KEY_XAI", "xai-val");
    deleteSecret(db, "XAI_API_KEY");
    strictEqual(getSecret(db, "API_KEY_XAI"), null);
    strictEqual(process.env.API_KEY_XAI, undefined);
    strictEqual(process.env.XAI_API_KEY, undefined);
  });

  it("is a no-op for a missing key", () => {
    deleteSecret(db, "NOPE");
    strictEqual(getSecret(db, "NOPE"), null);
  });
});
