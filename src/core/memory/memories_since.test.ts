import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { memoriesSince } from "./memories_since.ts";
import { initMemoryTable } from "./schema.ts";

describe("memoriesSince", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
  });

  it("returns memories created after the given timestamp", () => {
    const old = Date.now() - 100_000;
    const recent = Date.now() - 1000;
    db.prepare(
      `INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, 0.7, 1, ?, ?, 'explicit', 'fact')`,
    ).run("old memory", old, old);
    db.prepare(
      `INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, 0.7, 1, ?, ?, 'explicit', 'fact')`,
    ).run("new memory", recent, recent);

    const cutoff = Date.now() - 50_000;
    const result = memoriesSince(db, cutoff);
    strictEqual(result.length, 1);
    strictEqual(result[0].claim, "new memory");
  });

  it("excludes superseded memories", () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, 0.7, 1, ?, ?, 'explicit', 'fact')`,
    ).run("superseded", now, now);
    const { id } = db.prepare("SELECT id FROM memories WHERE claim = 'superseded'").get() as {
      id: number;
    };
    db.prepare("UPDATE memories SET superseded_by = ? WHERE id = ?").run(id, id);

    const result = memoriesSince(db, now - 1000);
    strictEqual(result.length, 0);
  });

  it("returns empty when no memories exist after timestamp", () => {
    const result = memoriesSince(db, Date.now());
    strictEqual(result.length, 0);
  });
});
