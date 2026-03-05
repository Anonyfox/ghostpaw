import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { DEFAULT_SOULS } from "./defaults.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { MANDATORY_SOUL_IDS, MANDATORY_SOUL_NAMES } from "./mandatory_souls.ts";
import { rowToSoul } from "./row_to_soul.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

function getSoulById(id: number) {
  const row = db.prepare("SELECT * FROM souls WHERE id = ?").get(id);
  return row ? rowToSoul(row as Record<string, unknown>) : null;
}

describe("ensureMandatorySouls", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
  });

  it("creates all mandatory souls with hardcoded IDs", () => {
    ensureMandatorySouls(db);
    for (const key of MANDATORY_SOUL_NAMES) {
      const id = MANDATORY_SOUL_IDS[key];
      const soul = getSoulById(id);
      ok(soul, `Missing mandatory soul: ${key} (ID ${id})`);
      strictEqual(soul!.id, id);
      strictEqual(soul!.slug, key);
      strictEqual(soul!.name, DEFAULT_SOULS[key].name);
      strictEqual(soul!.essence, DEFAULT_SOULS[key].essence);
      strictEqual(soul!.level, 0);
      strictEqual(soul!.deletedAt, null);
    }
  });

  it("is idempotent — safe to call multiple times", () => {
    ensureMandatorySouls(db);
    ensureMandatorySouls(db);
    ensureMandatorySouls(db);
    for (const key of MANDATORY_SOUL_NAMES) {
      ok(getSoulById(MANDATORY_SOUL_IDS[key]));
    }
  });

  it("restores empty essence for an existing mandatory soul", () => {
    ensureMandatorySouls(db);
    db.prepare("UPDATE souls SET essence = '' WHERE id = ?").run(MANDATORY_SOUL_IDS.ghostpaw);
    ensureMandatorySouls(db);
    const soul = getSoulById(MANDATORY_SOUL_IDS.ghostpaw)!;
    strictEqual(soul.essence, DEFAULT_SOULS.ghostpaw.essence);
  });

  it("restores whitespace-only essence", () => {
    ensureMandatorySouls(db);
    db.prepare("UPDATE souls SET essence = '   ' WHERE id = ?").run(MANDATORY_SOUL_IDS.ghostpaw);
    ensureMandatorySouls(db);
    strictEqual(getSoulById(MANDATORY_SOUL_IDS.ghostpaw)!.essence, DEFAULT_SOULS.ghostpaw.essence);
  });

  it("does not overwrite non-empty essence", () => {
    ensureMandatorySouls(db);
    db.prepare("UPDATE souls SET essence = 'custom essence' WHERE id = ?").run(
      MANDATORY_SOUL_IDS.ghostpaw,
    );
    ensureMandatorySouls(db);
    strictEqual(getSoulById(MANDATORY_SOUL_IDS.ghostpaw)!.essence, "custom essence");
  });

  it("restores a soft-deleted mandatory soul", () => {
    ensureMandatorySouls(db);
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = ?").run(
      Date.now(),
      MANDATORY_SOUL_IDS.mentor,
    );
    ensureMandatorySouls(db);
    const soul = getSoulById(MANDATORY_SOUL_IDS.mentor)!;
    strictEqual(soul.deletedAt, null);
  });

  it("preserves level when restoring essence", () => {
    ensureMandatorySouls(db);
    db.prepare("UPDATE souls SET level = 3, essence = '' WHERE id = ?").run(
      MANDATORY_SOUL_IDS["js-engineer"],
    );
    ensureMandatorySouls(db);
    const soul = getSoulById(MANDATORY_SOUL_IDS["js-engineer"])!;
    strictEqual(soul.level, 3);
    strictEqual(soul.essence, DEFAULT_SOULS["js-engineer"].essence);
  });

  it("sets default descriptions for mandatory souls", () => {
    ensureMandatorySouls(db);
    for (const key of MANDATORY_SOUL_NAMES) {
      const soul = getSoulById(MANDATORY_SOUL_IDS[key])!;
      strictEqual(soul.description, DEFAULT_SOULS[key].description);
    }
  });

  it("restores empty description for a mandatory soul", () => {
    ensureMandatorySouls(db);
    db.prepare("UPDATE souls SET description = '' WHERE id = ?").run(MANDATORY_SOUL_IDS.ghostpaw);
    ensureMandatorySouls(db);
    strictEqual(
      getSoulById(MANDATORY_SOUL_IDS.ghostpaw)!.description,
      DEFAULT_SOULS.ghostpaw.description,
    );
  });

  it("does not overwrite non-empty description", () => {
    ensureMandatorySouls(db);
    db.prepare("UPDATE souls SET description = 'custom desc' WHERE id = ?").run(
      MANDATORY_SOUL_IDS.ghostpaw,
    );
    ensureMandatorySouls(db);
    strictEqual(getSoulById(MANDATORY_SOUL_IDS.ghostpaw)!.description, "custom desc");
  });

  it("seeds default traits for souls with zero traits", () => {
    ensureMandatorySouls(db);
    for (const key of MANDATORY_SOUL_NAMES) {
      const id = MANDATORY_SOUL_IDS[key];
      const defaults = DEFAULT_SOULS[key];
      const rows = db
        .prepare("SELECT principle, provenance FROM soul_traits WHERE soul_id = ? ORDER BY id")
        .all(id) as { principle: string; provenance: string }[];
      strictEqual(rows.length, defaults.traits.length, `Trait count mismatch for ${key}`);
      for (let i = 0; i < defaults.traits.length; i++) {
        strictEqual(rows[i].principle, defaults.traits[i].principle);
        strictEqual(rows[i].provenance, defaults.traits[i].provenance);
      }
    }
  });

  it("does not seed traits if soul already has traits", () => {
    ensureMandatorySouls(db);
    const id = MANDATORY_SOUL_IDS.ghostpaw;
    const countBefore = (
      db.prepare("SELECT COUNT(*) AS c FROM soul_traits WHERE soul_id = ?").get(id) as {
        c: number;
      }
    ).c;
    ensureMandatorySouls(db);
    const countAfter = (
      db.prepare("SELECT COUNT(*) AS c FROM soul_traits WHERE soul_id = ?").get(id) as {
        c: number;
      }
    ).c;
    strictEqual(countAfter, countBefore, "Traits should not be duplicated on re-run");
  });

  it("seeds traits as active at generation 0", () => {
    ensureMandatorySouls(db);
    const rows = db
      .prepare("SELECT status, generation FROM soul_traits WHERE soul_id = ?")
      .all(MANDATORY_SOUL_IDS.ghostpaw) as { status: string; generation: number }[];
    ok(rows.length > 0);
    for (const row of rows) {
      strictEqual(row.status, "active");
      strictEqual(row.generation, 0);
    }
  });
});
