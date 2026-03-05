import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { createSoul } from "./create_soul.ts";
import { resolveSoul } from "./resolve_soul.ts";
import { initSoulsTables } from "./schema.ts";

describe("resolveSoul", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    createSoul(db, { name: "Alpha", essence: "first", description: "a" });
    createSoul(db, { name: "Beta Soul", essence: "second", description: "b" });
  });

  it("resolves by numeric ID", () => {
    const soul = resolveSoul(db, "1");
    assert.ok(soul);
    assert.strictEqual(soul.name, "Alpha");
  });

  it("resolves by name (exact)", () => {
    const soul = resolveSoul(db, "Alpha");
    assert.ok(soul);
    assert.strictEqual(soul.id, 1);
  });

  it("resolves by name (case-insensitive)", () => {
    const soul = resolveSoul(db, "alpha");
    assert.ok(soul);
    assert.strictEqual(soul.name, "Alpha");
  });

  it("resolves multi-word names", () => {
    const soul = resolveSoul(db, "beta soul");
    assert.ok(soul);
    assert.strictEqual(soul.name, "Beta Soul");
  });

  it("returns null for nonexistent ID", () => {
    assert.strictEqual(resolveSoul(db, "999"), null);
  });

  it("returns null for nonexistent name", () => {
    assert.strictEqual(resolveSoul(db, "Gamma"), null);
  });

  it("returns null for empty string", () => {
    assert.strictEqual(resolveSoul(db, ""), null);
  });

  it("returns null for whitespace-only input", () => {
    assert.strictEqual(resolveSoul(db, "   "), null);
  });

  it("trims whitespace from input", () => {
    const soul = resolveSoul(db, "  Alpha  ");
    assert.ok(soul);
    assert.strictEqual(soul.name, "Alpha");
  });

  it("treats '0' as a name, not an ID", () => {
    assert.strictEqual(resolveSoul(db, "0"), null);
  });

  it("treats negative numbers as names, not IDs", () => {
    assert.strictEqual(resolveSoul(db, "-1"), null);
  });

  it("excludes soft-deleted souls by ID", () => {
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = 1").run(Date.now());
    assert.strictEqual(resolveSoul(db, "1"), null);
  });

  it("excludes soft-deleted souls by name", () => {
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = 1").run(Date.now());
    assert.strictEqual(resolveSoul(db, "Alpha"), null);
  });
});
