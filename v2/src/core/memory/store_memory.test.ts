import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { bufferToVector } from "./buffer_to_vector.ts";
import { embedText } from "./embed_text.ts";
import { initMemoryTable } from "./schema.ts";
import { storeMemory } from "./store_memory.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initMemoryTable(db);
});

describe("storeMemory", () => {
  it("stores a memory and returns it with an autoincrement ID", () => {
    const embedding = embedText("test claim");
    const mem = storeMemory(db, "test claim", embedding);
    strictEqual(mem.id, 1);
    strictEqual(mem.claim, "test claim");
    strictEqual(mem.evidenceCount, 1);
    strictEqual(mem.supersededBy, null);
  });

  it("assigns source-weighted default confidence for explicit", () => {
    const mem = storeMemory(db, "explicit fact", embedText("t"), { source: "explicit" });
    strictEqual(mem.confidence, 0.9);
    strictEqual(mem.source, "explicit");
  });

  it("assigns source-weighted default confidence for observed", () => {
    const mem = storeMemory(db, "seen it", embedText("t"), { source: "observed" });
    strictEqual(mem.confidence, 0.8);
  });

  it("assigns source-weighted default confidence for distilled", () => {
    const mem = storeMemory(db, "learned it", embedText("t"));
    strictEqual(mem.confidence, 0.6);
    strictEqual(mem.source, "distilled");
  });

  it("assigns source-weighted default confidence for inferred", () => {
    const mem = storeMemory(db, "guessed it", embedText("t"), { source: "inferred" });
    strictEqual(mem.confidence, 0.5);
  });

  it("allows explicit confidence override", () => {
    const mem = storeMemory(db, "custom", embedText("t"), {
      source: "explicit",
      confidence: 0.42,
    });
    strictEqual(mem.confidence, 0.42);
  });

  it("stores category", () => {
    const mem = storeMemory(db, "likes cats", embedText("t"), { category: "preference" });
    strictEqual(mem.category, "preference");
  });

  it("defaults category to custom", () => {
    const mem = storeMemory(db, "misc", embedText("t"));
    strictEqual(mem.category, "custom");
  });

  it("stores embedding as BLOB that can be read back", () => {
    const embedding = embedText("roundtrip test");
    storeMemory(db, "roundtrip test", embedding);
    const row = db.prepare("SELECT embedding FROM memories WHERE id = 1").get() as Record<
      string,
      unknown
    >;
    const restored = bufferToVector(row.embedding as Uint8Array);
    strictEqual(restored.length, 256);
    for (let i = 0; i < embedding.length; i++) {
      ok(
        Math.abs(restored[i] - embedding[i]) < 1e-5,
        `embedding mismatch at ${i}: ${restored[i]} vs ${embedding[i]}`,
      );
    }
  });

  it("sets created_at and verified_at to approximately now", () => {
    const before = Date.now();
    const mem = storeMemory(db, "timing", embedText("t"));
    const after = Date.now();
    ok(mem.createdAt >= before && mem.createdAt <= after);
    ok(mem.verifiedAt >= before && mem.verifiedAt <= after);
  });

  it("auto-increments IDs across multiple stores", () => {
    const a = storeMemory(db, "first", embedText("t"));
    const b = storeMemory(db, "second", embedText("t"));
    strictEqual(a.id, 1);
    strictEqual(b.id, 2);
  });

  it("throws on empty claim", () => {
    throws(() => storeMemory(db, "", embedText("t")), /empty/);
  });

  it("throws on whitespace-only claim", () => {
    throws(() => storeMemory(db, "   \t\n  ", embedText("t")), /empty/);
  });

  it("trims whitespace from claim", () => {
    const mem = storeMemory(db, "  padded claim  ", embedText("t"));
    strictEqual(mem.claim, "padded claim");
  });

  it("clamps confidence above 1.0 to 1.0", () => {
    const mem = storeMemory(db, "over", embedText("t"), { confidence: 5.0 });
    strictEqual(mem.confidence, 1.0);
  });

  it("clamps confidence below 0.0 to 0.0", () => {
    const mem = storeMemory(db, "under", embedText("t"), { confidence: -1.0 });
    strictEqual(mem.confidence, 0.0);
  });
});
