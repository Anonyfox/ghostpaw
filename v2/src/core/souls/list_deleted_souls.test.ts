import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSoul } from "./create_soul.ts";
import { deleteSoul } from "./delete_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { listDeletedSouls } from "./list_deleted_souls.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

describe("listDeletedSouls", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
  });

  it("returns empty array when no souls are deleted", () => {
    createSoul(db, { name: "Active", essence: "" });
    strictEqual(listDeletedSouls(db).length, 0);
  });

  it("returns only soft-deleted souls", () => {
    createSoul(db, { name: "Alive", essence: "" });
    const s2 = createSoul(db, { name: "Dead", essence: "" });
    deleteSoul(db, s2.id);
    const deleted = listDeletedSouls(db);
    strictEqual(deleted.length, 1);
    strictEqual(deleted[0].id, s2.id);
    strictEqual(deleted[0].name, "Dead");
  });

  it("orders by deleted_at descending (most recent first)", () => {
    const s1 = createSoul(db, { name: "First", essence: "" });
    const s2 = createSoul(db, { name: "Second", essence: "" });
    db.prepare("UPDATE souls SET deleted_at = 1000, updated_at = 1000 WHERE id = ?").run(s1.id);
    db.prepare("UPDATE souls SET deleted_at = 2000, updated_at = 2000 WHERE id = ?").run(s2.id);
    const deleted = listDeletedSouls(db);
    strictEqual(deleted.length, 2);
    strictEqual(deleted[0].name, "Second");
    strictEqual(deleted[1].name, "First");
  });

  it("includes active trait counts for deleted souls", () => {
    const soul = createSoul(db, { name: "With Traits", essence: "" });
    const now = Date.now();
    db.prepare(
      `INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
       VALUES (?, 'p', 'e', 0, 'active', ?, ?)`,
    ).run(soul.id, now, now);
    deleteSoul(db, soul.id);
    const deleted = listDeletedSouls(db);
    strictEqual(deleted[0].activeTraitCount, 1);
  });

  it("includes description in deleted soul summaries", () => {
    const soul = createSoul(db, {
      name: "Desc Del",
      essence: "",
      description: "Was useful.",
    });
    deleteSoul(db, soul.id);
    const deleted = listDeletedSouls(db);
    strictEqual(deleted[0].description, "Was useful.");
  });
});
