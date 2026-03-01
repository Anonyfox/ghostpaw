import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initConfigTable, setConfig } from "../config/index.ts";
import { initSoulsTables } from "./schema.ts";
import { getTraitLimit } from "./trait_limit.ts";

let db: DatabaseHandle;

describe("getTraitLimit", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initConfigTable(db);
    initSoulsTables(db);
  });

  it("returns 10 as the default when no config is set", () => {
    strictEqual(getTraitLimit(db), 10);
  });

  it("reads a custom value from the config table", () => {
    setConfig(db, "soul_trait_limit", 15, "web");
    strictEqual(getTraitLimit(db), 15);
  });

  it("clamps corrupted DB values to at least 1", () => {
    db.prepare(
      "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("soul_trait_limit", "0", "integer", "behavior", "web", Date.now());
    strictEqual(getTraitLimit(db), 1);
  });

  it("reads updated value after config change", () => {
    setConfig(db, "soul_trait_limit", 7, "web");
    strictEqual(getTraitLimit(db), 7);
    setConfig(db, "soul_trait_limit", 12, "web");
    strictEqual(getTraitLimit(db), 12);
  });

  it("falls back to default when config table does not exist", async () => {
    const bareDb = await openTestDatabase();
    strictEqual(getTraitLimit(bareDb), 10);
  });
});
