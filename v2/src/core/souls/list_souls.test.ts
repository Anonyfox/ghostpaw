import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSoul } from "./create_soul.ts";
import { listSouls } from "./list_souls.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

describe("listSouls", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
  });

  it("returns empty array when no souls exist", () => {
    strictEqual(listSouls(db).length, 0);
  });

  it("returns all active souls ordered by created_at", () => {
    createSoul(db, { name: "Alpha", essence: "" });
    createSoul(db, { name: "Beta", essence: "" });
    const list = listSouls(db);
    strictEqual(list.length, 2);
    strictEqual(list[0].name, "Alpha");
    strictEqual(list[1].name, "Beta");
  });

  it("includes id in summary", () => {
    const created = createSoul(db, { name: "WithID", essence: "" });
    const list = listSouls(db);
    strictEqual(list[0].id, created.id);
  });

  it("excludes soft-deleted souls", () => {
    const s1 = createSoul(db, { name: "Active", essence: "" });
    const s2 = createSoul(db, { name: "Deleted", essence: "" });
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = ?").run(Date.now(), s2.id);
    const list = listSouls(db);
    strictEqual(list.length, 1);
    strictEqual(list[0].id, s1.id);
  });

  it("includes correct active trait counts", () => {
    const soul = createSoul(db, { name: "With Traits", essence: "" });
    const now = Date.now();
    db.prepare(
      `INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
       VALUES (?, 'p1', 'e1', 0, 'active', ?, ?)`,
    ).run(soul.id, now, now);
    db.prepare(
      `INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
       VALUES (?, 'p2', 'e2', 0, 'active', ?, ?)`,
    ).run(soul.id, now, now);
    db.prepare(
      `INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
       VALUES (?, 'p3', 'e3', 0, 'reverted', ?, ?)`,
    ).run(soul.id, now, now);

    const list = listSouls(db);
    strictEqual(list[0].activeTraitCount, 2);
  });

  it("shows zero active traits for a soul with no traits", () => {
    createSoul(db, { name: "Bare", essence: "" });
    const list = listSouls(db);
    strictEqual(list[0].activeTraitCount, 0);
  });

  it("includes description in summary", () => {
    createSoul(db, {
      name: "Desc Test",
      essence: "",
      description: "A helpful soul.",
    });
    const list = listSouls(db);
    strictEqual(list[0].description, "A helpful soul.");
  });

  it("defaults description to empty string when not provided", () => {
    createSoul(db, { name: "No Desc", essence: "" });
    const list = listSouls(db);
    strictEqual(list[0].description, "");
  });
});
