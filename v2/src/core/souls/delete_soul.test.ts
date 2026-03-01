import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSoul } from "./create_soul.ts";
import { deleteSoul } from "./delete_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { getSoul } from "./get_soul.ts";
import { listSouls } from "./list_souls.ts";
import { MANDATORY_SOUL_IDS } from "./mandatory_souls.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

describe("deleteSoul", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
  });

  it("soft-deletes a soul by setting deleted_at", () => {
    const soul = createSoul(db, { name: "Custom", essence: "" });
    deleteSoul(db, soul.id);
    const after = getSoul(db, soul.id);
    ok(after);
    ok(after!.deletedAt != null);
  });

  it("removes soul from active list but preserves it in database", () => {
    const soul = createSoul(db, { name: "Custom", essence: "" });
    const beforeCount = listSouls(db).length;
    deleteSoul(db, soul.id);
    strictEqual(listSouls(db).length, beforeCount - 1);
    ok(getSoul(db, soul.id));
  });

  it("preserves linked traits after soft-delete", () => {
    const soul = createSoul(db, { name: "WT", essence: "" });
    const now = Date.now();
    db.prepare(
      `INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
       VALUES (?, 'p', 'e', 0, 'active', ?, ?)`,
    ).run(soul.id, now, now);
    deleteSoul(db, soul.id);
    const count = db
      .prepare("SELECT COUNT(*) AS c FROM soul_traits WHERE soul_id = ?")
      .get(soul.id) as { c: number };
    strictEqual(count.c, 1);
  });

  it("throws when archiving a mandatory soul", () => {
    throws(() => deleteSoul(db, MANDATORY_SOUL_IDS.ghostpaw), /mandatory/i);
    throws(() => deleteSoul(db, MANDATORY_SOUL_IDS["js-engineer"]), /mandatory/i);
    throws(() => deleteSoul(db, MANDATORY_SOUL_IDS["prompt-engineer"]), /mandatory/i);
    throws(() => deleteSoul(db, MANDATORY_SOUL_IDS.mentor), /mandatory/i);
  });

  it("throws when soul does not exist", () => {
    throws(() => deleteSoul(db, 999), /not found/i);
  });

  it("throws when soul is already archived", () => {
    const soul = createSoul(db, { name: "Double", essence: "" });
    deleteSoul(db, soul.id);
    throws(() => deleteSoul(db, soul.id), /archived/i);
  });

  it("frees the name for reuse by new active souls", () => {
    const soul = createSoul(db, { name: "Reuse", essence: "" });
    deleteSoul(db, soul.id);
    const newSoul = createSoul(db, { name: "Reuse", essence: "" });
    ok(newSoul.id > soul.id);
  });
});
