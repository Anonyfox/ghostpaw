import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initConfigTable, setConfig } from "../core/config/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { resolveModel } from "./model.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

describe("resolveModel", () => {
  it("returns hardcoded fallback when config table is empty", () => {
    strictEqual(resolveModel(db), "claude-sonnet-4-6");
  });

  it("returns configured value when set", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    strictEqual(resolveModel(db), "gpt-4o");
  });

  it("override takes priority over config", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    strictEqual(resolveModel(db, "claude-opus-4"), "claude-opus-4");
  });

  it("whitespace-only override falls through to config", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    strictEqual(resolveModel(db, "   "), "gpt-4o");
  });

  it("empty string override falls through to config", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    strictEqual(resolveModel(db, ""), "gpt-4o");
  });

  it("override is trimmed", () => {
    strictEqual(resolveModel(db, "  gpt-4o  "), "gpt-4o");
  });
});
