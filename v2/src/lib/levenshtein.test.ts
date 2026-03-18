import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { closestMatches, levenshtein } from "./levenshtein.ts";

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    strictEqual(levenshtein("abc", "abc"), 0);
  });

  it("returns length of other string when one is empty", () => {
    strictEqual(levenshtein("", "hello"), 5);
    strictEqual(levenshtein("hello", ""), 5);
  });

  it("returns 0 for two empty strings", () => {
    strictEqual(levenshtein("", ""), 0);
  });

  it("counts single insertion", () => {
    strictEqual(levenshtein("cat", "cats"), 1);
  });

  it("counts single deletion", () => {
    strictEqual(levenshtein("cats", "cat"), 1);
  });

  it("counts single substitution", () => {
    strictEqual(levenshtein("cat", "car"), 1);
  });

  it("handles transposition as two edits", () => {
    strictEqual(levenshtein("ab", "ba"), 2);
  });

  it("computes correct distance for longer strings", () => {
    strictEqual(levenshtein("kitten", "sitting"), 3);
    strictEqual(levenshtein("saturday", "sunday"), 3);
  });

  it("handles unicode characters", () => {
    strictEqual(levenshtein("café", "cafe"), 1);
    strictEqual(levenshtein("日本語", "日本人"), 1);
  });

  it("is case-sensitive", () => {
    strictEqual(levenshtein("ABC", "abc"), 3);
  });
});

describe("closestMatches", () => {
  it("returns closest matches sorted by distance", () => {
    const candidates = ["grok-3", "grok-4", "gpt-4.1", "claude-sonnet"];
    const result = closestMatches("grk-3", candidates);
    strictEqual(result[0], "grok-3");
  });

  it("breaks ties alphabetically", () => {
    const candidates = ["bbb", "aaa", "ccc"];
    const result = closestMatches("aab", candidates, 3);
    strictEqual(result[0], "aaa");
    strictEqual(result[1], "bbb");
  });

  it("limits results to maxResults", () => {
    const candidates = ["a", "b", "c", "d", "e"];
    const result = closestMatches("z", candidates, 2);
    strictEqual(result.length, 2);
  });

  it("defaults to 3 results", () => {
    const candidates = ["a", "b", "c", "d", "e"];
    const result = closestMatches("z", candidates);
    strictEqual(result.length, 3);
  });

  it("returns empty array for empty candidates", () => {
    deepStrictEqual(closestMatches("hello", []), []);
  });

  it("returns fewer than maxResults when candidates are fewer", () => {
    const result = closestMatches("hello", ["hi"], 5);
    strictEqual(result.length, 1);
  });
});
