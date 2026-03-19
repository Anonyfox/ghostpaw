import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { memoriesRevisedSince } from "./memories_revised_since.ts";
import { initMemoryTable } from "./schema.ts";

describe("memoriesRevisedSince", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
  });

  it("returns memories revised after the given timestamp but created before it", () => {
    const createdAt = Date.now() - 200_000;
    const revisedAt = Date.now() - 1000;
    db.prepare(
      `INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, 0.8, 2, ?, ?, 'explicit', 'fact')`,
    ).run("revised memory", createdAt, revisedAt);

    const cutoff = Date.now() - 100_000;
    const result = memoriesRevisedSince(db, cutoff);
    strictEqual(result.length, 1);
    strictEqual(result[0].claim, "revised memory");
  });

  it("excludes memories created after the cutoff", () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, 0.8, 2, ?, ?, 'explicit', 'fact')`,
    ).run("new memory", now, now);

    const result = memoriesRevisedSince(db, now - 1000);
    strictEqual(result.length, 0);
  });

  it("returns empty when nothing was revised", () => {
    const result = memoriesRevisedSince(db, Date.now() - 100_000);
    strictEqual(result.length, 0);
  });
});
