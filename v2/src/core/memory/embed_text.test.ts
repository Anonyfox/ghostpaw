import { deepStrictEqual, ok, strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import { cosineSimilarity } from "./cosine_similarity.ts";
import { embedText } from "./embed_text.ts";

describe("embedText", () => {
  it("returns a 256-dimensional vector by default", () => {
    const vec = embedText("hello world");
    strictEqual(vec.length, 256);
  });

  it("respects custom dimensions", () => {
    const vec = embedText("test", 128);
    strictEqual(vec.length, 128);
  });

  it("returns a zero vector for empty string", () => {
    const vec = embedText("");
    ok(vec.every((v) => v === 0));
  });

  it("returns a zero vector for whitespace-only string", () => {
    const vec = embedText("   \t\n  ");
    ok(vec.every((v) => v === 0));
  });

  it("is deterministic — same input yields identical output", () => {
    const a = embedText("the user loves sushi");
    const b = embedText("the user loves sushi");
    deepStrictEqual(a, b);
  });

  it("output is L2-normalized (magnitude ~1.0)", () => {
    const vec = embedText("some text for normalization");
    const magnitude = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    ok(Math.abs(magnitude - 1.0) < 1e-10, `expected magnitude ~1.0, got ${magnitude}`);
  });

  it("similar texts produce high cosine similarity", () => {
    const a = new Float32Array(embedText("the user loves pizza"));
    const b = new Float32Array(embedText("the user really loves pizza"));
    const sim = cosineSimilarity(a, b);
    ok(sim > 0.7, `expected >0.7, got ${sim}`);
  });

  it("dissimilar texts produce low cosine similarity", () => {
    const a = new Float32Array(embedText("the quick brown fox"));
    const b = new Float32Array(embedText("quantum mechanics equations"));
    const sim = cosineSimilarity(a, b);
    ok(sim < 0.3, `expected <0.3, got ${sim}`);
  });

  it("is case-insensitive", () => {
    const a = embedText("Hello World");
    const b = embedText("hello world");
    deepStrictEqual(a, b);
  });

  it("normalizes whitespace", () => {
    const a = embedText("hello   world");
    const b = embedText("hello world");
    deepStrictEqual(a, b);
  });

  it("handles unicode text", () => {
    const vec = embedText("日本語テキスト");
    const magnitude = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    ok(magnitude > 0, "unicode text should produce a non-zero vector");
    ok(Math.abs(magnitude - 1.0) < 1e-10, "unicode text should be L2-normalized");
  });

  it("short text under 3 chars returns zero vector", () => {
    const vec = embedText("hi");
    ok(vec.every((v) => v === 0));
  });

  it("throws on dims <= 0", () => {
    throws(() => embedText("test", 0), RangeError);
    throws(() => embedText("test", -1), RangeError);
  });

  it("works with dims = 1", () => {
    const vec = embedText("hello world", 1);
    strictEqual(vec.length, 1);
  });
});
