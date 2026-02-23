import { ok, strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";

import { findAndReplace, findUniqueMatch } from "./diff.js";

describe("findUniqueMatch", () => {
  it("finds an exact unique match and returns its position", () => {
    const content = "line one\nline two\nline three\n";
    const result = findUniqueMatch(content, "line two");
    strictEqual(result.kind, "exact");
    strictEqual(result.index, 9);
    strictEqual(result.matchedText, "line two");
  });

  it("returns 'none' when search string is not found", () => {
    const result = findUniqueMatch("hello world", "goodbye");
    strictEqual(result.kind, "none");
  });

  it("returns 'ambiguous' when multiple exact matches exist", () => {
    const content = "foo bar foo";
    const result = findUniqueMatch(content, "foo");
    strictEqual(result.kind, "ambiguous");
    strictEqual(result.count, 2);
  });

  it("handles multi-line search strings", () => {
    const content = "a\nb\nc\nd\n";
    const result = findUniqueMatch(content, "b\nc");
    strictEqual(result.kind, "exact");
    strictEqual(result.matchedText, "b\nc");
  });

  it("falls back to fuzzy whitespace-normalized match", () => {
    const content = "  function hello()  {\n    return true;\n  }";
    const search = "function hello() {\n  return true;\n}";
    const result = findUniqueMatch(content, search);
    strictEqual(result.kind, "fuzzy");
    ok(result.matchedText!.includes("function hello()"));
  });

  it("fuzzy match handles tab vs space differences", () => {
    const content = "function test() {\n\treturn 42;\n}";
    const search = "function test() {\n    return 42;\n}";
    const result = findUniqueMatch(content, search);
    strictEqual(result.kind, "fuzzy");
    ok(result.matchedText!.includes("return 42"));
  });

  it("returns 'none' even for fuzzy when content differs semantically", () => {
    const result = findUniqueMatch("apples and oranges", "bananas and grapes");
    strictEqual(result.kind, "none");
  });

  it("handles empty search string", () => {
    const result = findUniqueMatch("content", "");
    strictEqual(result.kind, "none");
  });

  it("handles empty content", () => {
    const result = findUniqueMatch("", "search");
    strictEqual(result.kind, "none");
  });

  it("is case-sensitive for exact match", () => {
    const result = findUniqueMatch("Hello World", "hello world");
    ok(result.kind !== "exact");
  });

  it("handles special regex characters in search", () => {
    const content = "value = arr[0].map(x => x * 2)";
    const result = findUniqueMatch(content, "arr[0].map(x => x * 2)");
    strictEqual(result.kind, "exact");
  });
});

describe("findAndReplace", () => {
  it("replaces a unique exact match", () => {
    const result = findAndReplace("hello world", "world", "universe");
    strictEqual(result.newContent, "hello universe");
    strictEqual(result.matchKind, "exact");
  });

  it("preserves surrounding content", () => {
    const content = "line 1\nline 2\nline 3\n";
    const result = findAndReplace(content, "line 2", "line two");
    strictEqual(result.newContent, "line 1\nline two\nline 3\n");
  });

  it("throws on ambiguous match", () => {
    throws(
      () => findAndReplace("foo bar foo", "foo", "baz"),
      (err: Error) => err.message.includes("2 matches"),
    );
  });

  it("throws on no match", () => {
    throws(
      () => findAndReplace("hello", "goodbye", "x"),
      (err: Error) => err.message.includes("not found"),
    );
  });

  it("handles multi-line replacement", () => {
    const content = "start\nold line 1\nold line 2\nend";
    const result = findAndReplace(
      content,
      "old line 1\nold line 2",
      "new line A\nnew line B\nnew line C",
    );
    strictEqual(result.newContent, "start\nnew line A\nnew line B\nnew line C\nend");
  });

  it("replaces with empty string (deletion)", () => {
    const result = findAndReplace("hello beautiful world", " beautiful", "");
    strictEqual(result.newContent, "hello world");
  });

  it("works when search is the entire content", () => {
    const result = findAndReplace("all of this", "all of this", "replaced");
    strictEqual(result.newContent, "replaced");
  });

  it("uses fuzzy match when exact fails due to whitespace", () => {
    const content = "  function test()  {\n    return 1;\n  }";
    const search = "function test() {\n  return 1;\n}";
    const replacement = "function test() {\n  return 2;\n}";
    const result = findAndReplace(content, search, replacement);
    strictEqual(result.matchKind, "fuzzy");
    ok(result.newContent.includes("return 2"));
  });

  it("handles replacement that contains the search string", () => {
    const result = findAndReplace("hello world", "world", "world world");
    strictEqual(result.newContent, "hello world world");
  });

  it("preserves line endings consistently", () => {
    const content = "line1\r\nline2\r\nline3";
    const result = findAndReplace(content, "line2", "LINE2");
    strictEqual(result.newContent, "line1\r\nLINE2\r\nline3");
  });
});
