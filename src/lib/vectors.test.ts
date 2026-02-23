import { deepStrictEqual, ok, strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import { bufferToVector, cosineSimilarity, topK, vectorToBuffer } from "./vectors.js";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const a = new Float32Array([1, 2, 3]);
    const result = cosineSimilarity(a, a);
    ok(Math.abs(result - 1.0) < 1e-6);
  });

  it("returns -1 for opposite vectors", () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([-1, 0, 0]);
    const result = cosineSimilarity(a, b);
    ok(Math.abs(result - -1.0) < 1e-6);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([0, 1, 0]);
    const result = cosineSimilarity(a, b);
    ok(Math.abs(result) < 1e-6);
  });

  it("computes correctly for known values", () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([4, 5, 6]);
    // dot = 4+10+18 = 32, |a| = sqrt(14), |b| = sqrt(77)
    const expected = 32 / (Math.sqrt(14) * Math.sqrt(77));
    const result = cosineSimilarity(a, b);
    ok(Math.abs(result - expected) < 1e-5);
  });

  it("returns 0 when a vector is all zeros", () => {
    const a = new Float32Array([0, 0, 0]);
    const b = new Float32Array([1, 2, 3]);
    strictEqual(cosineSimilarity(a, b), 0);
    strictEqual(cosineSimilarity(b, a), 0);
  });

  it("handles single-dimension vectors", () => {
    const a = new Float32Array([3]);
    const b = new Float32Array([7]);
    const result = cosineSimilarity(a, b);
    ok(Math.abs(result - 1.0) < 1e-6);
  });

  it("handles negative values", () => {
    const a = new Float32Array([-1, -2, -3]);
    const b = new Float32Array([-4, -5, -6]);
    const result = cosineSimilarity(a, b);
    ok(result > 0.97);
  });

  it("is order-independent (symmetric)", () => {
    const a = new Float32Array([0.5, 0.3, 0.8, 0.1]);
    const b = new Float32Array([0.2, 0.9, 0.4, 0.7]);
    const ab = cosineSimilarity(a, b);
    const ba = cosineSimilarity(b, a);
    ok(Math.abs(ab - ba) < 1e-6);
  });

  it("handles high-dimensional vectors (512-dim)", () => {
    const a = new Float32Array(512);
    const b = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      a[i] = Math.sin(i);
      b[i] = Math.cos(i);
    }
    const result = cosineSimilarity(a, b);
    ok(result >= -1 && result <= 1);
  });

  it("throws on mismatched lengths", () => {
    const a = new Float32Array([1, 2]);
    const b = new Float32Array([1, 2, 3]);
    throws(() => cosineSimilarity(a, b));
  });
});

describe("vectorToBuffer / bufferToVector", () => {
  it("round-trips a vector exactly", () => {
    const original = [0.1, 0.2, 0.3, 0.4, 0.5];
    const buf = vectorToBuffer(original);
    const restored = bufferToVector(buf);
    strictEqual(restored.length, 5);
    for (let i = 0; i < original.length; i++) {
      ok(Math.abs(restored[i]! - original[i]!) < 1e-6);
    }
  });

  it("produces correct byte length (4 bytes per float32)", () => {
    const buf = vectorToBuffer([1, 2, 3]);
    strictEqual(buf.byteLength, 12);
  });

  it("round-trips an empty vector", () => {
    const buf = vectorToBuffer([]);
    strictEqual(buf.byteLength, 0);
    const restored = bufferToVector(buf);
    strictEqual(restored.length, 0);
  });

  it("round-trips high-dimensional vectors", () => {
    const dims = 1536;
    const original = Array.from({ length: dims }, (_, i) => Math.sin(i * 0.01));
    const buf = vectorToBuffer(original);
    strictEqual(buf.byteLength, dims * 4);
    const restored = bufferToVector(buf);
    strictEqual(restored.length, dims);
    for (let i = 0; i < 10; i++) {
      ok(Math.abs(restored[i]! - original[i]!) < 1e-6);
    }
  });

  it("handles negative and extreme values", () => {
    const original = [-1e10, 0, 1e10, -0.000001, 0.000001];
    const buf = vectorToBuffer(original);
    const restored = bufferToVector(buf);
    strictEqual(restored.length, 5);
    strictEqual(restored[1], 0);
  });
});

describe("topK", () => {
  it("returns the k most similar candidates", () => {
    const query = new Float32Array([1, 0, 0]);
    const candidates = [
      { id: "a", embedding: new Float32Array([1, 0, 0]) },
      { id: "b", embedding: new Float32Array([0, 1, 0]) },
      { id: "c", embedding: new Float32Array([0.9, 0.1, 0]) },
    ];

    const results = topK(query, candidates, 2);
    strictEqual(results.length, 2);
    strictEqual(results[0]!.id, "a");
    strictEqual(results[1]!.id, "c");
    ok(results[0]!.score > results[1]!.score);
  });

  it("returns fewer than k when candidates are insufficient", () => {
    const query = new Float32Array([1, 0]);
    const candidates = [{ id: "only", embedding: new Float32Array([0.5, 0.5]) }];
    const results = topK(query, candidates, 10);
    strictEqual(results.length, 1);
  });

  it("returns empty array for empty candidates", () => {
    const query = new Float32Array([1, 0]);
    const results = topK(query, [], 5);
    deepStrictEqual(results, []);
  });

  it("scores are between -1 and 1", () => {
    const query = new Float32Array([0.5, -0.3, 0.8]);
    const candidates = [
      { id: "a", embedding: new Float32Array([0.1, 0.9, -0.4]) },
      { id: "b", embedding: new Float32Array([-0.7, 0.2, 0.6]) },
      { id: "c", embedding: new Float32Array([0.5, -0.3, 0.8]) },
    ];
    const results = topK(query, candidates, 3);
    for (const r of results) {
      ok(r.score >= -1 && r.score <= 1);
    }
  });

  it("handles k=0", () => {
    const query = new Float32Array([1]);
    const candidates = [{ id: "a", embedding: new Float32Array([1]) }];
    const results = topK(query, candidates, 0);
    strictEqual(results.length, 0);
  });

  it("filters by minimum score threshold", () => {
    const query = new Float32Array([1, 0, 0]);
    const candidates = [
      { id: "close", embedding: new Float32Array([0.95, 0.05, 0]) },
      { id: "far", embedding: new Float32Array([0, 0, 1]) },
      { id: "medium", embedding: new Float32Array([0.5, 0.5, 0]) },
    ];
    const results = topK(query, candidates, 10, 0.6);
    strictEqual(results.length, 2);
    ok(results.every((r) => r.score >= 0.6));
  });
});
