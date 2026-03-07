import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { randomMemories } from "./random_memories.ts";
import { initMemoryTable } from "./schema.ts";

function insertMemory(
  db: DatabaseHandle,
  claim: string,
  opts: { category?: string; confidence?: number } = {},
): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category)
     VALUES (?, ?, 1, ?, ?, 'explicit', ?)`,
  ).run(claim, opts.confidence ?? 0.7, now, now, opts.category ?? "fact");
}

describe("randomMemories", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
  });

  it("returns random active memories for a category", () => {
    insertMemory(db, "sky is blue", { category: "fact" });
    insertMemory(db, "grass is green", { category: "fact" });
    insertMemory(db, "likes coffee", { category: "preference" });

    const facts = randomMemories(db, {
      category: "fact",
      limit: 10,
      minConfidence: 0.3,
    });
    strictEqual(facts.length, 2);
    strictEqual(
      facts.every((m) => m.category === "fact"),
      true,
    );
  });

  it("respects minConfidence threshold", () => {
    insertMemory(db, "strong belief", { category: "fact", confidence: 0.8 });
    insertMemory(db, "weak belief", { category: "fact", confidence: 0.2 });

    const result = randomMemories(db, {
      category: "fact",
      limit: 10,
      minConfidence: 0.5,
    });
    strictEqual(result.length, 1);
    strictEqual(result[0].claim, "strong belief");
  });

  it("excludes memories matching excludeTopic", () => {
    insertMemory(db, "python is great", { category: "fact" });
    insertMemory(db, "rust is fast", { category: "fact" });

    const result = randomMemories(db, {
      category: "fact",
      limit: 10,
      minConfidence: 0.3,
      excludeTopic: "python",
    });
    strictEqual(result.length, 1);
    strictEqual(result[0].claim, "rust is fast");
  });

  it("returns empty array for no matches", () => {
    const result = randomMemories(db, {
      category: "procedure",
      limit: 10,
      minConfidence: 0.3,
    });
    strictEqual(result.length, 0);
  });

  it("excludes superseded memories", () => {
    insertMemory(db, "old fact", { category: "fact" });
    const id = (
      db.prepare("SELECT id FROM memories WHERE claim = 'old fact'").get() as { id: number }
    ).id;
    db.prepare("UPDATE memories SET superseded_by = ? WHERE id = ?").run(id, id);

    const result = randomMemories(db, {
      category: "fact",
      limit: 10,
      minConfidence: 0.3,
    });
    strictEqual(result.length, 0);
  });
});
