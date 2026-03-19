import { ok } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { initTrailTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

function tableExists(name: string): boolean {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
  return !!row;
}

function indexExists(name: string): boolean {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name=?").get(name);
  return !!row;
}

describe("initTrailTables", () => {
  it("creates all trail tables", () => {
    ok(tableExists("trail_chronicle"));
    ok(tableExists("trail_chapters"));
    ok(tableExists("trail_trailmarks"));
    ok(tableExists("trail_pairing_wisdom"));
    ok(tableExists("trail_open_loops"));
    ok(tableExists("trail_calibration"));
    ok(tableExists("trail_omens"));
    ok(tableExists("trail_preamble"));
    ok(tableExists("trail_sweep_state"));
  });

  it("creates all indices", () => {
    ok(indexExists("idx_trail_chronicle_date"));
    ok(indexExists("idx_trail_chronicle_chapter"));
    ok(indexExists("idx_trail_chapters_active"));
    ok(indexExists("idx_trail_trailmarks_chronicle"));
    ok(indexExists("idx_trail_trailmarks_chapter"));
    ok(indexExists("idx_trail_pairing_wisdom_category"));
    ok(indexExists("idx_trail_open_loops_status"));
    ok(indexExists("idx_trail_open_loops_resurface"));
    ok(indexExists("idx_trail_calibration_key"));
    ok(indexExists("idx_trail_omens_unresolved"));
    ok(indexExists("idx_trail_preamble_latest"));
  });

  it("is idempotent", () => {
    initTrailTables(db);
    initTrailTables(db);
    ok(tableExists("trail_chronicle"));
  });

  it("enforces trail_sweep_state singleton via CHECK(id = 1)", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO trail_sweep_state (id, last_sweep_at, updated_at) VALUES (1, ?, ?)",
    ).run(now, now);

    let threw = false;
    try {
      db.prepare(
        "INSERT INTO trail_sweep_state (id, last_sweep_at, updated_at) VALUES (2, ?, ?)",
      ).run(now, now);
    } catch {
      threw = true;
    }
    ok(threw, "should reject id != 1");
  });

  it("enforces momentum CHECK constraint", () => {
    const now = Date.now();
    let threw = false;
    try {
      db.prepare(
        `INSERT INTO trail_chapters (label, started_at, momentum, confidence, created_at, updated_at)
         VALUES ('test', ?, 'invalid', 0.5, ?, ?)`,
      ).run(now, now, now);
    } catch {
      threw = true;
    }
    ok(threw, "should reject invalid momentum");
  });

  it("enforces wisdom category CHECK constraint", () => {
    const now = Date.now();
    let threw = false;
    try {
      db.prepare(
        `INSERT INTO trail_pairing_wisdom (category, pattern, guidance, created_at, updated_at)
         VALUES ('invalid', 'p', 'g', ?, ?)`,
      ).run(now, now);
    } catch {
      threw = true;
    }
    ok(threw, "should reject invalid category");
  });
});
