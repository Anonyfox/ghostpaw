import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { oldestMemory } from "./oldest_memory.ts";
import { initMemoryTable } from "./schema.ts";

describe("oldestMemory", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
  });

  it("returns null when no memories exist", () => {
    strictEqual(oldestMemory(db), null);
  });

  it("returns the oldest active memory", () => {
    const old = Date.now() - 100_000;
    const recent = Date.now() - 1000;
    db.prepare(
      `INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, 0.7, 1, ?, ?, 'explicit', 'fact')`,
    ).run("older fact", old, old);
    db.prepare(
      `INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, 0.7, 1, ?, ?, 'explicit', 'fact')`,
    ).run("newer fact", recent, recent);

    const result = oldestMemory(db);
    strictEqual(result?.claim, "older fact");
  });

  it("excludes superseded memories", () => {
    const old = Date.now() - 100_000;
    db.prepare(
      `INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, 0.7, 1, ?, ?, 'explicit', 'fact')`,
    ).run("superseded", old, old);
    const { id } = db.prepare("SELECT id FROM memories WHERE claim = 'superseded'").get() as {
      id: number;
    };
    db.prepare("UPDATE memories SET superseded_by = ? WHERE id = ?").run(id, id);

    strictEqual(oldestMemory(db), null);
  });
});
