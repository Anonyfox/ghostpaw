import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFtsQuery } from "./build_fts_query.ts";

describe("buildFtsQuery", () => {
  it("joins tokens with OR and quotes each", () => {
    strictEqual(buildFtsQuery("user likes pizza"), '"user" OR "likes" OR "pizza"');
  });

  it("strips punctuation and special characters", () => {
    strictEqual(
      buildFtsQuery("what's the user's preference?"),
      '"what" OR "the" OR "user" OR "preference"',
    );
  });

  it("filters tokens shorter than 2 characters", () => {
    strictEqual(buildFtsQuery("I am a test"), '"am" OR "test"');
  });

  it("returns null for empty input", () => {
    strictEqual(buildFtsQuery(""), null);
  });

  it("returns null when all tokens are too short", () => {
    strictEqual(buildFtsQuery("I a"), null);
  });

  it("lowercases tokens", () => {
    strictEqual(buildFtsQuery("Pizza SUSHI"), '"pizza" OR "sushi"');
  });

  it("handles unicode text", () => {
    const result = buildFtsQuery("café naïve");
    ok(result?.includes('"café"'));
    ok(result?.includes('"naïve"'));
  });
});
