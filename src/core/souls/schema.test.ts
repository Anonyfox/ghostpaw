import { doesNotThrow, ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

describe("initSoulsTables", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
  });

  it("creates all three tables", () => {
    initSoulsTables(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => (r as { name: string }).name);
    ok(tables.includes("souls"), "souls table missing");
    ok(tables.includes("soul_traits"), "soul_traits table missing");
    ok(tables.includes("soul_levels"), "soul_levels table missing");
  });

  it("is idempotent — calling twice does not throw", () => {
    initSoulsTables(db);
    doesNotThrow(() => initSoulsTables(db));
  });

  it("enforces foreign key from soul_traits to souls", () => {
    initSoulsTables(db);
    throws(() => {
      db.prepare(
        `INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
         VALUES (999, 'p', 'e', 0, 'active', 1, 1)`,
      ).run();
    });
  });

  it("enforces foreign key from soul_levels to souls", () => {
    initSoulsTables(db);
    throws(() => {
      db.prepare(
        `INSERT INTO soul_levels (soul_id, level, essence_before, essence_after, created_at)
         VALUES (999, 1, 'before', 'after', 1)`,
      ).run();
    });
  });

  it("enforces CHECK constraint on soul_traits status", () => {
    initSoulsTables(db);
    const now = Date.now();
    db.prepare(
      "INSERT INTO souls (name, essence, level, created_at, updated_at) VALUES (?, '', 0, ?, ?)",
    ).run("Test Soul", now, now);
    const soul = db.prepare("SELECT id FROM souls WHERE name = ?").get("Test Soul") as {
      id: number;
    };
    throws(() => {
      db.prepare(
        `INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
         VALUES (?, 'p', 'e', 0, 'invalid_status', ?, ?)`,
      ).run(soul.id, now, now);
    });
  });

  it("allows valid trait insertion", () => {
    initSoulsTables(db);
    const now = Date.now();
    db.prepare(
      "INSERT INTO souls (name, essence, level, created_at, updated_at) VALUES (?, '', 0, ?, ?)",
    ).run("Test Soul", now, now);
    const soul = db.prepare("SELECT id FROM souls WHERE name = ?").get("Test Soul") as {
      id: number;
    };
    doesNotThrow(() => {
      db.prepare(
        `INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
         VALUES (?, 'principle', 'evidence', 0, 'active', ?, ?)`,
      ).run(soul.id, now, now);
    });
    const count = db.prepare("SELECT COUNT(*) as c FROM soul_traits").get() as { c: number };
    strictEqual(count.c, 1);
  });

  it("enforces name uniqueness among active souls via partial unique index", () => {
    initSoulsTables(db);
    const now = Date.now();
    db.prepare(
      "INSERT INTO souls (name, essence, level, created_at, updated_at) VALUES (?, '', 0, ?, ?)",
    ).run("Unique Name", now, now);
    throws(() => {
      db.prepare(
        "INSERT INTO souls (name, essence, level, created_at, updated_at) VALUES (?, '', 0, ?, ?)",
      ).run("Unique Name", now, now);
    });
  });

  it("allows duplicate names when one soul is soft-deleted", () => {
    initSoulsTables(db);
    const now = Date.now();
    db.prepare(
      "INSERT INTO souls (name, essence, level, created_at, updated_at, deleted_at) VALUES (?, '', 0, ?, ?, ?)",
    ).run("Dup Name", now, now, now);
    doesNotThrow(() => {
      db.prepare(
        "INSERT INTO souls (name, essence, level, created_at, updated_at) VALUES (?, '', 0, ?, ?)",
      ).run("Dup Name", now, now);
    });
  });
});
