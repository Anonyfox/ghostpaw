import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { memoryCategoryCounts } from "./memory_category_counts.ts";
import { initMemoryTable } from "./schema.ts";

describe("memoryCategoryCounts", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
  });

  it("returns empty array when no memories exist", () => {
    strictEqual(memoryCategoryCounts(db).length, 0);
  });

  it("counts active memories per category", () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, 0.7, 1, ?, ?, 'explicit', 'fact')`,
    ).run("fact 1", now, now);
    db.prepare(
      `INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, 0.7, 1, ?, ?, 'explicit', 'fact')`,
    ).run("fact 2", now, now);
    db.prepare(
      `INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, 0.7, 1, ?, ?, 'explicit', 'preference')`,
    ).run("pref 1", now, now);

    const counts = memoryCategoryCounts(db);
    const factCount = counts.find((c) => c.category === "fact");
    const prefCount = counts.find((c) => c.category === "preference");
    strictEqual(factCount?.count, 2);
    strictEqual(prefCount?.count, 1);
  });

  it("excludes superseded memories from counts", () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, 0.7, 1, ?, ?, 'explicit', 'fact')`,
    ).run("superseded fact", now, now);
    const { id } = db.prepare("SELECT id FROM memories WHERE claim = 'superseded fact'").get() as {
      id: number;
    };
    db.prepare("UPDATE memories SET superseded_by = ? WHERE id = ?").run(id, id);

    strictEqual(memoryCategoryCounts(db).length, 0);
  });

  it("omits categories with zero count", () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, 0.7, 1, ?, ?, 'explicit', 'procedure')`,
    ).run("proc 1", now, now);

    const counts = memoryCategoryCounts(db);
    strictEqual(counts.length, 1);
    strictEqual(counts[0].category, "procedure");
  });
});
