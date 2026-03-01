import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSoul } from "./create_soul.ts";
import { deleteSoul } from "./delete_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { listDeletedSouls } from "./list_deleted_souls.ts";
import { listSouls } from "./list_souls.ts";
import { restoreSoul } from "./restore_soul.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

describe("restoreSoul", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
  });

  it("restores a soft-deleted soul", () => {
    const soul = createSoul(db, { name: "Archived", essence: "e" });
    deleteSoul(db, soul.id);
    const restored = restoreSoul(db, soul.id);
    strictEqual(restored.deletedAt, null);
    strictEqual(restored.name, "Archived");
    ok(listSouls(db).some((s) => s.id === soul.id));
    strictEqual(listDeletedSouls(db).length, 0);
  });

  it("restores with a new name", () => {
    const soul = createSoul(db, { name: "Old Name", essence: "" });
    deleteSoul(db, soul.id);
    const restored = restoreSoul(db, soul.id, "New Name");
    strictEqual(restored.name, "New Name");
    strictEqual(restored.deletedAt, null);
  });

  it("throws when name conflicts with active soul", () => {
    createSoul(db, { name: "Taken", essence: "" });
    const soul = createSoul(db, { name: "Other", essence: "" });
    deleteSoul(db, soul.id);
    throws(() => restoreSoul(db, soul.id, "Taken"), /already exists/i);
  });

  it("throws when original name conflicts with active soul", () => {
    const soul = createSoul(db, { name: "Conflict", essence: "" });
    deleteSoul(db, soul.id);
    createSoul(db, { name: "Conflict", essence: "" });
    throws(() => restoreSoul(db, soul.id), /already exists/i);
  });

  it("throws when soul is not archived", () => {
    const soul = createSoul(db, { name: "Active", essence: "" });
    throws(() => restoreSoul(db, soul.id), /not archived/i);
  });

  it("throws when soul does not exist", () => {
    throws(() => restoreSoul(db, 999), /not found/i);
  });

  it("throws on empty new name", () => {
    const soul = createSoul(db, { name: "Named", essence: "" });
    deleteSoul(db, soul.id);
    throws(() => restoreSoul(db, soul.id, "  "), /not be empty/i);
  });

  it("preserves traits and level through archive/restore cycle", () => {
    const soul = createSoul(db, { name: "Persisted", essence: "" });
    const now = Date.now();
    db.prepare(
      `INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
       VALUES (?, 'p', 'e', 0, 'active', ?, ?)`,
    ).run(soul.id, now, now);
    db.prepare("UPDATE souls SET level = 2 WHERE id = ?").run(soul.id);
    deleteSoul(db, soul.id);
    const restored = restoreSoul(db, soul.id);
    strictEqual(restored.level, 2);
    const traitCount = db
      .prepare("SELECT COUNT(*) AS c FROM soul_traits WHERE soul_id = ?")
      .get(soul.id) as { c: number };
    strictEqual(traitCount.c, 1);
  });
});
