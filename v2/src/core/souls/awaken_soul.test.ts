import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { awakenSoul } from "./awaken_soul.ts";
import { createSoul } from "./create_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { listDormantSouls } from "./list_dormant_souls.ts";
import { listSouls } from "./list_souls.ts";
import { retireSoul } from "./retire_soul.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

describe("awakenSoul", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
  });

  it("awakens a dormant soul", () => {
    const soul = createSoul(db, { name: "Dormant", essence: "e" });
    retireSoul(db, soul.id);
    const awakened = awakenSoul(db, soul.id);
    strictEqual(awakened.deletedAt, null);
    strictEqual(awakened.name, "Dormant");
    ok(listSouls(db).some((s) => s.id === soul.id));
    strictEqual(listDormantSouls(db).length, 0);
  });

  it("awakens with a new name", () => {
    const soul = createSoul(db, { name: "Old Name", essence: "" });
    retireSoul(db, soul.id);
    const awakened = awakenSoul(db, soul.id, "New Name");
    strictEqual(awakened.name, "New Name");
    strictEqual(awakened.deletedAt, null);
  });

  it("throws when name conflicts with active soul", () => {
    createSoul(db, { name: "Taken", essence: "" });
    const soul = createSoul(db, { name: "Other", essence: "" });
    retireSoul(db, soul.id);
    throws(() => awakenSoul(db, soul.id, "Taken"), /already exists/i);
  });

  it("throws when original name conflicts with active soul", () => {
    const soul = createSoul(db, { name: "Conflict", essence: "" });
    retireSoul(db, soul.id);
    createSoul(db, { name: "Conflict", essence: "" });
    throws(() => awakenSoul(db, soul.id), /already exists/i);
  });

  it("throws when soul is not dormant", () => {
    const soul = createSoul(db, { name: "Active", essence: "" });
    throws(() => awakenSoul(db, soul.id), /not dormant/i);
  });

  it("throws when soul does not exist", () => {
    throws(() => awakenSoul(db, 999), /not found/i);
  });

  it("throws on empty new name", () => {
    const soul = createSoul(db, { name: "Named", essence: "" });
    retireSoul(db, soul.id);
    throws(() => awakenSoul(db, soul.id, "  "), /not be empty/i);
  });

  it("preserves traits and level through retire/awaken cycle", () => {
    const soul = createSoul(db, { name: "Persisted", essence: "" });
    const now = Date.now();
    db.prepare(
      `INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
       VALUES (?, 'p', 'e', 0, 'active', ?, ?)`,
    ).run(soul.id, now, now);
    db.prepare("UPDATE souls SET level = 2 WHERE id = ?").run(soul.id);
    retireSoul(db, soul.id);
    const awakened = awakenSoul(db, soul.id);
    strictEqual(awakened.level, 2);
    const traitCount = db
      .prepare("SELECT COUNT(*) AS c FROM soul_traits WHERE soul_id = ?")
      .get(soul.id) as { c: number };
    strictEqual(traitCount.c, 1);
  });
});
