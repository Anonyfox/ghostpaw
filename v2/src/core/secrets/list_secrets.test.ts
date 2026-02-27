import { deepStrictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { listSecrets } from "./list_secrets.ts";
import { initSecretsTable } from "./schema.ts";
import { setSecret } from "./set_secret.ts";

let db: DatabaseHandle;

const ENV_KEYS = ["A_KEY", "B_KEY", "C_KEY"];
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

describe("listSecrets", () => {
  it("returns sorted key names", () => {
    setSecret(db, "B_KEY", "b");
    setSecret(db, "A_KEY", "a");
    setSecret(db, "C_KEY", "c");
    deepStrictEqual(listSecrets(db), ["A_KEY", "B_KEY", "C_KEY"]);
  });

  it("returns empty array when no secrets exist", () => {
    deepStrictEqual(listSecrets(db), []);
  });
});
