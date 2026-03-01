import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSoul } from "./create_soul.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

describe("createSoul", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
  });

  it("creates a soul with auto-generated ID and returns it", () => {
    const soul = createSoul(db, {
      name: "Test Soul",
      essence: "A test.",
    });
    ok(soul.id > 0);
    strictEqual(soul.name, "Test Soul");
    strictEqual(soul.slug, null);
    strictEqual(soul.essence, "A test.");
    strictEqual(soul.description, "");
    strictEqual(soul.level, 0);
    strictEqual(soul.deletedAt, null);
    ok(soul.createdAt > 0);
    ok(soul.updatedAt > 0);
  });

  it("creates a soul with a description", () => {
    const soul = createSoul(db, {
      name: "Described",
      essence: "e",
      description: "A helpful soul.",
    });
    strictEqual(soul.description, "A helpful soul.");
  });

  it("trims the name", () => {
    const soul = createSoul(db, { name: "  Trimmed  ", essence: "" });
    strictEqual(soul.name, "Trimmed");
  });

  it("allows empty essence", () => {
    const soul = createSoul(db, { name: "Empty", essence: "" });
    strictEqual(soul.essence, "");
  });

  it("throws on duplicate active name", () => {
    createSoul(db, { name: "Duplicate", essence: "" });
    throws(() => createSoul(db, { name: "Duplicate", essence: "" }));
  });

  it("allows duplicate name when existing is soft-deleted", () => {
    const first = createSoul(db, { name: "Dup", essence: "" });
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = ?").run(Date.now(), first.id);
    const second = createSoul(db, { name: "Dup", essence: "" });
    ok(second.id > first.id);
    strictEqual(second.name, "Dup");
  });

  it("throws on empty name", () => {
    throws(() => createSoul(db, { name: "", essence: "" }), /not be empty/);
  });

  it("throws on whitespace-only name", () => {
    throws(() => createSoul(db, { name: "   ", essence: "" }), /not be empty/);
  });

  it("throws on null name", () => {
    throws(() => createSoul(db, { name: null as unknown as string, essence: "" }), /name.*string/i);
  });

  it("throws on null essence", () => {
    throws(
      () => createSoul(db, { name: "Valid", essence: null as unknown as string }),
      /essence.*string/i,
    );
  });
});
