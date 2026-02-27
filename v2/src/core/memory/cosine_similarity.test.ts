import { ok, strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import { cosineSimilarity } from "./cosine_similarity.ts";

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    const v = new Float32Array([1, 2, 3]);
    const sim = cosineSimilarity(v, v);
    ok(Math.abs(sim - 1.0) < 1e-6, `expected ~1.0, got ${sim}`);
  });

  it("returns 0.0 for orthogonal vectors", () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([0, 1, 0]);
    const sim = cosineSimilarity(a, b);
    ok(Math.abs(sim) < 1e-6, `expected ~0.0, got ${sim}`);
  });

  it("returns -1.0 for opposite vectors", () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([-1, -2, -3]);
    const sim = cosineSimilarity(a, b);
    ok(Math.abs(sim + 1.0) < 1e-6, `expected ~-1.0, got ${sim}`);
  });

  it("returns 0.0 when one vector is all zeros", () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([0, 0, 0]);
    strictEqual(cosineSimilarity(a, b), 0);
  });

  it("returns 0.0 when both vectors are all zeros", () => {
    const a = new Float32Array([0, 0, 0]);
    strictEqual(cosineSimilarity(a, a), 0);
  });

  it("throws on mismatched lengths", () => {
    const a = new Float32Array([1, 2]);
    const b = new Float32Array([1, 2, 3]);
    throws(() => cosineSimilarity(a, b), RangeError);
  });

  it("handles normalized vs unnormalized equally", () => {
    const a = new Float32Array([3, 4, 0]);
    const b = new Float32Array([6, 8, 0]);
    const sim = cosineSimilarity(a, b);
    ok(Math.abs(sim - 1.0) < 1e-6, `parallel vectors should yield ~1.0, got ${sim}`);
  });

  it("handles large vectors", () => {
    const size = 256;
    const a = new Float32Array(size);
    const b = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      a[i] = Math.sin(i);
      b[i] = Math.cos(i);
    }
    const sim = cosineSimilarity(a, b);
    ok(sim > -1 && sim < 1, `expected value in (-1,1), got ${sim}`);
  });
});
