import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { confirmMemory } from "./confirm_memory.ts";
import { embedText } from "./embed_text.ts";
import { initMemoryTable } from "./schema.ts";
import { storeMemory } from "./store_memory.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initMemoryTable(db);
});

describe("confirmMemory", () => {
  it("increases confidence via EMA", () => {
    const mem = storeMemory(db, "fact", embedText("t"), { source: "inferred" });
    strictEqual(mem.confidence, 0.5);
    const confirmed = confirmMemory(db, mem.id);
    const expected = 0.3 * 1.0 + 0.7 * 0.5;
    ok(
      Math.abs(confirmed.confidence - expected) < 1e-10,
      `expected ${expected}, got ${confirmed.confidence}`,
    );
  });

  it("increments evidence count", () => {
    const mem = storeMemory(db, "fact", embedText("t"));
    strictEqual(mem.evidenceCount, 1);
    const confirmed = confirmMemory(db, mem.id);
    strictEqual(confirmed.evidenceCount, 2);
    const again = confirmMemory(db, mem.id);
    strictEqual(again.evidenceCount, 3);
  });

  it("resets verified_at to approximately now", () => {
    const mem = storeMemory(db, "fact", embedText("t"));
    const before = Date.now();
    const confirmed = confirmMemory(db, mem.id);
    const after = Date.now();
    ok(confirmed.verifiedAt >= before && confirmed.verifiedAt <= after);
  });

  it("caps confidence at 0.99", () => {
    const mem = storeMemory(db, "solid", embedText("t"), {
      source: "explicit",
      confidence: 0.99,
    });
    const confirmed = confirmMemory(db, mem.id);
    ok(confirmed.confidence <= 0.99, `expected <= 0.99, got ${confirmed.confidence}`);
  });

  it("throws for nonexistent ID", () => {
    throws(() => confirmMemory(db, 999), /not found/);
  });

  it("throws for superseded memory", () => {
    const old = storeMemory(db, "old", embedText("t"));
    const replacement = storeMemory(db, "new", embedText("t"));
    db.prepare("UPDATE memories SET superseded_by = ? WHERE id = ?").run(replacement.id, old.id);
    throws(() => confirmMemory(db, old.id), /superseded/);
  });
});
