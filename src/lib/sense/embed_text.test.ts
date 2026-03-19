import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { embedText } from "./embed_text.ts";

describe("embedText", () => {
  it("returns 256 dimensions by default", () => {
    strictEqual(embedText("test").length, 256);
  });

  it("is deterministic", () => {
    const a = embedText("the quick brown fox");
    const b = embedText("the quick brown fox");
    deepStrictEqual(a, b);
  });

  it("produces L2-normalized vectors", () => {
    const vec = embedText("some text for normalization testing");
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    ok(Math.abs(norm - 1.0) < 1e-10, `norm was ${norm}`);
  });

  it("returns zero vector for very short text", () => {
    ok(embedText("").every((v) => v === 0));
    ok(embedText("ab").every((v) => v === 0));
  });

  it("is case-insensitive", () => {
    deepStrictEqual(embedText("Hello World"), embedText("hello world"));
  });
});
