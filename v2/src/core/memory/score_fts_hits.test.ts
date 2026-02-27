import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { embedText } from "./embed_text.ts";
import { scoreFtsHits } from "./score_fts_hits.ts";
import type { FtsHit } from "./types.ts";
import { vectorToBuffer } from "./vector_to_buffer.ts";

function makeHit(claim: string, overrides?: Partial<FtsHit>): FtsHit {
  const emb = embedText(claim);
  const buf = vectorToBuffer(emb);
  return {
    id: 1,
    claim,
    embedding: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
    confidence: 0.9,
    evidenceCount: 3,
    createdAt: Date.now(),
    verifiedAt: Date.now(),
    source: "explicit",
    category: "fact",
    ...overrides,
  };
}

describe("scoreFtsHits", () => {
  it("scores hits using similarity * confidence * freshness", () => {
    const hit = makeHit("user loves pizza");
    const queryVec = new Float32Array(embedText("user loves pizza"));
    const results = scoreFtsHits([hit], queryVec, 90, 0, Date.now());
    strictEqual(results.length, 1);
    ok(results[0].score > 0);
    ok(results[0].similarity > 0);
  });

  it("filters hits below minScore", () => {
    const hit = makeHit("completely unrelated topic about quantum physics");
    const queryVec = new Float32Array(embedText("banana recipes"));
    const results = scoreFtsHits([hit], queryVec, 90, 999, Date.now());
    strictEqual(results.length, 0);
  });

  it("returns empty array for empty hits", () => {
    const queryVec = new Float32Array(embedText("test"));
    strictEqual(scoreFtsHits([], queryVec, 90, 0, Date.now()).length, 0);
  });

  it("preserves all memory fields in output", () => {
    const hit = makeHit("test claim", { id: 42, source: "observed", category: "preference" });
    const queryVec = new Float32Array(embedText("test claim"));
    const results = scoreFtsHits([hit], queryVec, 90, 0, Date.now());
    strictEqual(results[0].id, 42);
    strictEqual(results[0].source, "observed");
    strictEqual(results[0].category, "preference");
    strictEqual(results[0].supersededBy, null);
  });
});
