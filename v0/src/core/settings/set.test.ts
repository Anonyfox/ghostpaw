import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { initSettingsTable } from "./schema.ts";
import { clearSecretRegistry, getSecretValues } from "./scrub.ts";
import { setSetting } from "./set.ts";

describe("settings/set", () => {
  let db: DatabaseHandle;

  beforeEach(() => {
    db = openMemoryDatabase();
    initSettingsTable(db);
    clearSecretRegistry();
  });

  afterEach(() => {
    db.close();
    clearSecretRegistry();
    delete process.env.GHOSTPAW_MODEL;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.MY_CUSTOM_KEY;
  });

  it("inserts a new setting", () => {
    setSetting(db, "GHOSTPAW_MODEL", "gpt-5.4");
    const row = db
      .prepare("SELECT * FROM settings WHERE key = 'GHOSTPAW_MODEL' AND next_id IS NULL")
      .get() as Record<string, unknown>;
    assert.strictEqual(row.value, "gpt-5.4");
    assert.strictEqual(row.type, "string");
    assert.strictEqual(row.secret, 0);
  });

  it("updates process.env", () => {
    setSetting(db, "GHOSTPAW_MODEL", "gpt-5.4");
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "gpt-5.4");
  });

  it("creates linked list on overwrite", () => {
    setSetting(db, "GHOSTPAW_MODEL", "first");
    setSetting(db, "GHOSTPAW_MODEL", "second");
    const heads = db
      .prepare("SELECT * FROM settings WHERE key = 'GHOSTPAW_MODEL' AND next_id IS NULL")
      .all();
    assert.strictEqual(heads.length, 1);
    assert.strictEqual((heads[0] as Record<string, unknown>).value, "second");

    const total = db
      .prepare("SELECT COUNT(*) as c FROM settings WHERE key = 'GHOSTPAW_MODEL'")
      .get() as { c: number };
    assert.strictEqual(total.c, 2);
  });

  it("auto-detects secret flag for known secret keys", () => {
    setSetting(db, "ANTHROPIC_API_KEY", "sk-ant-test12345678");
    const row = db
      .prepare("SELECT secret FROM settings WHERE key = 'ANTHROPIC_API_KEY' AND next_id IS NULL")
      .get() as { secret: number };
    assert.strictEqual(row.secret, 1);
  });

  it("registers secret in scrub registry", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test12345678";
    setSetting(db, "ANTHROPIC_API_KEY", "sk-ant-test12345678");
    const values = getSecretValues();
    assert.ok(values.includes("sk-ant-test12345678"));
  });

  it("canonicalizes key names via shorthand", () => {
    setSetting(db, "model", "test");
    const row = db.prepare("SELECT key FROM settings WHERE next_id IS NULL").get() as Record<
      string,
      unknown
    >;
    assert.strictEqual(row.key, "GHOSTPAW_MODEL");
  });

  it("cleans values", () => {
    setSetting(db, "GHOSTPAW_MODEL", '  "gpt-5.4"  ');
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "gpt-5.4");
  });

  it("returns validation warning for cross-slot keys", () => {
    const result = setSetting(db, "ANTHROPIC_API_KEY", "xai-wrong-slot");
    assert.ok(result.warning);
    assert.ok(result.warning.includes("XAI_API_KEY"));
  });

  it("accepts custom keys with explicit secret flag", () => {
    setSetting(db, "MY_CUSTOM_KEY", "custom_value", { secret: true });
    const row = db
      .prepare("SELECT secret FROM settings WHERE key = 'MY_CUSTOM_KEY' AND next_id IS NULL")
      .get() as { secret: number };
    assert.strictEqual(row.secret, 1);
  });

  it("infers type from value", () => {
    setSetting(db, "CUSTOM_INT", "42");
    const row = db
      .prepare("SELECT type FROM settings WHERE key = 'CUSTOM_INT' AND next_id IS NULL")
      .get() as { type: string };
    assert.strictEqual(row.type, "integer");
  });

  it("records source", () => {
    setSetting(db, "GHOSTPAW_MODEL", "test", { source: "env" });
    const row = db
      .prepare("SELECT source FROM settings WHERE key = 'GHOSTPAW_MODEL' AND next_id IS NULL")
      .get() as { source: string };
    assert.strictEqual(row.source, "env");
  });

  it("throws on empty key", () => {
    assert.throws(() => setSetting(db, "", "value"), /must not be empty/);
    assert.throws(() => setSetting(db, "   ", "value"), /must not be empty/);
  });
});
