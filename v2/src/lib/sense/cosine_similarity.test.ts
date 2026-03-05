import { ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { cosineSimilarity } from "./cosine_similarity.ts";
import { embedText } from "./embed_text.ts";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const vec = embedText("identical text");
    ok(Math.abs(cosineSimilarity(vec, vec) - 1.0) < 1e-10);
  });

  it("returns higher value for similar texts", () => {
    const a = embedText("the cat sat on the mat");
    const b = embedText("the cat sat on the rug");
    const c = embedText("quantum physics particle accelerators");
    ok(cosineSimilarity(a, b) > cosineSimilarity(a, c));
  });

  it("throws RangeError for mismatched vector lengths", () => {
    throws(() => cosineSimilarity([1, 2, 3], [1, 2]), RangeError);
  });
});
