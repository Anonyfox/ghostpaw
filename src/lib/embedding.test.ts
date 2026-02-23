import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { createEmbeddingProvider } from "./embedding.js";
import { cosineSimilarity } from "./vectors.js";

describe("createEmbeddingProvider", () => {
  it("produces deterministic vectors", async () => {
    const ep = createEmbeddingProvider();
    const v1 = await ep.embed("hello world");
    const v2 = await ep.embed("hello world");
    strictEqual(v1.length, 256);
    for (let i = 0; i < v1.length; i++) strictEqual(v1[i], v2[i]);
  });

  it("produces different vectors for different texts", async () => {
    const ep = createEmbeddingProvider();
    const v1 = await ep.embed("TypeScript is great");
    const v2 = await ep.embed("Python is awesome");
    ok(v1.some((val, i) => val !== v2[i]));
  });

  it("produces L2-normalized vectors", async () => {
    const ep = createEmbeddingProvider();
    const vec = await ep.embed("some text for testing normalization");
    let norm = 0;
    for (const v of vec) norm += v * v;
    ok(Math.abs(Math.sqrt(norm) - 1.0) < 1e-6);
  });

  it("returns zero vector for empty string", async () => {
    const ep = createEmbeddingProvider();
    const vec = await ep.embed("");
    strictEqual(vec.length, 256);
    ok(vec.every((v) => v === 0));
  });

  it("similar texts have higher cosine similarity than unrelated texts", async () => {
    const ep = createEmbeddingProvider();
    const vCat1 = new Float32Array(await ep.embed("the cat sat on the mat"));
    const vCat2 = new Float32Array(await ep.embed("the cat sat on the rug"));
    const vPhysics = new Float32Array(
      await ep.embed("quantum chromodynamics explains color confinement"),
    );

    const simClose = cosineSimilarity(vCat1, vCat2);
    const simFar = cosineSimilarity(vCat1, vPhysics);
    ok(simClose > simFar, `Close: ${simClose}, Far: ${simFar}`);
  });

  it("embedMany processes all inputs", async () => {
    const ep = createEmbeddingProvider();
    const results = await ep.embedMany(["one", "two", "three"]);
    strictEqual(results.length, 3);
    for (const vec of results) strictEqual(vec.length, 256);
  });

  it("supports custom dimensions", async () => {
    const ep = createEmbeddingProvider(64);
    const vec = await ep.embed("test");
    strictEqual(vec.length, 64);
  });
});
