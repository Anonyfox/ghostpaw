import { deepStrictEqual, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { tokenize } from "./tokenize.ts";

describe("tokenize", () => {
  it("lowercases and splits on whitespace", () => {
    deepStrictEqual(tokenize("Hello World"), ["hello", "world"]);
  });

  it("keeps hyphens and apostrophes", () => {
    const words = tokenize("It's a well-known fact, isn't it?");
    ok(words.includes("it's"));
    ok(words.includes("well-known"));
  });

  it("returns empty array for empty string", () => {
    deepStrictEqual(tokenize(""), []);
  });

  it("collapses multiple spaces", () => {
    deepStrictEqual(tokenize("a   b    c"), ["a", "b", "c"]);
  });

  it("handles numbers", () => {
    ok(tokenize("there are 42 items").includes("42"));
  });

  it("handles unicode by stripping non-ASCII letters", () => {
    const words = tokenize("café résumé naïve");
    ok(words.length > 0);
    for (const w of words) {
      ok(/^[a-z0-9'-]+$/.test(w), `unexpected token: ${w}`);
    }
  });

  it("handles very long strings without throwing", () => {
    const long = "word ".repeat(10_000);
    const words = tokenize(long);
    ok(words.length === 10_000);
  });
});
