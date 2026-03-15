import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { initSoulsTables } from "./schema.ts";
import { traitChangesSince } from "./trait_changes_since.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initSoulsTables(db);
});

describe("traitChangesSince", () => {
  it("returns empty when no changes exist", () => {
    const changes = traitChangesSince(db, 0);
    strictEqual(changes.traits.length, 0);
    strictEqual(changes.levels.length, 0);
  });

  it("filters traits by updated_at", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO souls (id, slug, name, essence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(1, "test", "Test", "e", now, now);
    db.prepare(
      "INSERT INTO soul_traits (soul_id, principle, provenance, status, generation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(1, "old trait", "p", "active", 0, now - 200_000, now - 200_000);
    db.prepare(
      "INSERT INTO soul_traits (soul_id, principle, provenance, status, generation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(1, "new trait", "p", "active", 0, now, now);
    const changes = traitChangesSince(db, now - 50_000);
    strictEqual(changes.traits.length, 1);
    strictEqual(changes.traits[0].principle, "new trait");
  });

  it("includes level changes since the timestamp", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO souls (id, slug, name, essence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(1, "test", "Test", "e", now, now);
    db.prepare(
      "INSERT INTO soul_levels (soul_id, level, essence_before, essence_after, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(1, 2, "before", "after", now);
    const changes = traitChangesSince(db, now - 50_000);
    strictEqual(changes.levels.length, 1);
    strictEqual(changes.levels[0].level, 2);
  });
});
