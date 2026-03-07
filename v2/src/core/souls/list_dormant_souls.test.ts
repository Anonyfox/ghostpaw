import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSoul } from "./create_soul.ts";
import { retireSoul } from "./retire_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { listDormantSouls } from "./list_dormant_souls.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

describe("listDormantSouls", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
  });

  it("returns empty array when no souls are dormant", () => {
    createSoul(db, { name: "Active", essence: "" });
    strictEqual(listDormantSouls(db).length, 0);
  });

  it("returns only dormant souls", () => {
    createSoul(db, { name: "Alive", essence: "" });
    const s2 = createSoul(db, { name: "Dead", essence: "" });
    retireSoul(db, s2.id);
    const dormant = listDormantSouls(db);
    strictEqual(dormant.length, 1);
    strictEqual(dormant[0].id, s2.id);
    strictEqual(dormant[0].name, "Dead");
  });

  it("orders by deleted_at descending (most recent first)", () => {
    const s1 = createSoul(db, { name: "First", essence: "" });
    const s2 = createSoul(db, { name: "Second", essence: "" });
    db.prepare("UPDATE souls SET deleted_at = 1000, updated_at = 1000 WHERE id = ?").run(s1.id);
    db.prepare("UPDATE souls SET deleted_at = 2000, updated_at = 2000 WHERE id = ?").run(s2.id);
    const dormant = listDormantSouls(db);
    strictEqual(dormant.length, 2);
    strictEqual(dormant[0].name, "Second");
    strictEqual(dormant[1].name, "First");
  });

  it("includes active trait counts for dormant souls", () => {
    const soul = createSoul(db, { name: "With Traits", essence: "" });
    const now = Date.now();
    db.prepare(
      `INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
       VALUES (?, 'p', 'e', 0, 'active', ?, ?)`,
    ).run(soul.id, now, now);
    retireSoul(db, soul.id);
    const dormant = listDormantSouls(db);
    strictEqual(dormant[0].activeTraitCount, 1);
  });

  it("includes description in dormant soul summaries", () => {
    const soul = createSoul(db, {
      name: "Desc Del",
      essence: "",
      description: "Was useful.",
    });
    retireSoul(db, soul.id);
    const dormant = listDormantSouls(db);
    strictEqual(dormant[0].description, "Was useful.");
  });
});
