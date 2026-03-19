import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initConfigTable } from "../config/runtime/index.ts";
import { fadingMemories } from "./fading_memories.ts";
import { initMemoryTable } from "./schema.ts";

describe("fadingMemories", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
    initConfigTable(db);
  });

  afterEach(() => db.close());

  it("returns empty for fresh database", () => {
    const result = fadingMemories(db);
    strictEqual(result.length, 0);
  });

  it("finds memories in the fading freshness zone", () => {
    const now = Date.now();
    const halfLife = 90;
    const msPerDay = 86_400_000;
    const targetAgeDays = halfLife * Math.sqrt(1) * 0.7;
    const targetVerifiedAt = now - targetAgeDays * msPerDay;

    db.prepare(
      `INSERT INTO memories (claim, embedding, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, ?, 0.8, 1, ?, ?, 'explicit', 'fact')`,
    ).run("Fading memory", Buffer.alloc(1024), targetVerifiedAt, targetVerifiedAt);

    const result = fadingMemories(db);
    ok(result.length > 0, "Expected at least one fading memory");
    strictEqual(result[0].claim, "Fading memory");
  });

  it("excludes very fresh memories", () => {
    db.prepare(
      `INSERT INTO memories (claim, embedding, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, ?, 0.8, 1, ?, ?, 'explicit', 'fact')`,
    ).run("Fresh memory", Buffer.alloc(1024), Date.now(), Date.now());

    const result = fadingMemories(db);
    strictEqual(result.length, 0);
  });
});
