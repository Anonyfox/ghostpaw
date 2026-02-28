import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initConfigTable, setConfig } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { resolveModel } from "./resolve_model.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

describe("resolveModel", () => {
  it("returns the override when provided", () => {
    strictEqual(resolveModel(db, "gpt-4o"), "gpt-4o");
  });

  it("returns the configured default when no override", () => {
    setConfig(db, "default_model", "custom-model", "cli", "string");
    strictEqual(resolveModel(db), "custom-model");
  });

  it("returns the hardcoded fallback when no override and no config", () => {
    strictEqual(resolveModel(db), "claude-sonnet-4-6");
  });

  it("treats empty string override as absent", () => {
    strictEqual(resolveModel(db, ""), "claude-sonnet-4-6");
  });
});
