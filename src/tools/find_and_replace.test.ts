import { ok, strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import { findAndReplace } from "./find_and_replace.ts";

describe("findAndReplace", () => {
  it("replaces a unique exact match", () => {
    const result = findAndReplace("hello world", "world", "universe");
    strictEqual(result.newContent, "hello universe");
    strictEqual(result.matchKind, "exact");
  });

  it("preserves surrounding content", () => {
    const result = findAndReplace("line 1\nline 2\nline 3\n", "line 2", "line two");
    strictEqual(result.newContent, "line 1\nline two\nline 3\n");
  });

  it("handles multi-line search and replacement", () => {
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

  it("handles replacement that contains the search string", () => {
    const result = findAndReplace("hello world", "world", "world world");
    strictEqual(result.newContent, "hello world world");
  });

  it("preserves CRLF line endings", () => {
    const content = "line1\r\nline2\r\nline3";
    const result = findAndReplace(content, "line2", "LINE2");
    strictEqual(result.newContent, "line1\r\nLINE2\r\nline3");
  });

  it("handles special regex characters in search", () => {
    const content = "value = arr[0].map(x => x * 2)";
    const result = findAndReplace(content, "arr[0].map(x => x * 2)", "arr[0].filter(Boolean)");
    strictEqual(result.matchKind, "exact");
    strictEqual(result.newContent, "value = arr[0].filter(Boolean)");
  });
});

describe("findAndReplace — fuzzy whitespace matching", () => {
  it("falls back to fuzzy match when whitespace differs", () => {
    const content = "  function hello()  {\n    return true;\n  }";
    const result = findAndReplace(
      content,
      "function hello() {\n  return true;\n}",
      "function hello() {\n  return 2;\n}",
    );
    strictEqual(result.matchKind, "fuzzy");
    ok(result.newContent.includes("return 2"));
  });

  it("fuzzy-matches tabs vs spaces", () => {
    const content = "function test() {\n\treturn 42;\n}";
    const result = findAndReplace(
      content,
      "function test() {\n    return 42;\n}",
      "function test() {\n    return 99;\n}",
    );
    strictEqual(result.matchKind, "fuzzy");
    ok(result.newContent.includes("return 99"));
  });

  it("is case-sensitive even in fuzzy mode", () => {
    throws(
      () => findAndReplace("Hello World", "hello world", "x"),
      (err: Error) => err.message.includes("not found"),
    );
  });
});

describe("findAndReplace — error cases", () => {
  it("throws on ambiguous match (multiple occurrences)", () => {
    throws(
      () => findAndReplace("foo bar foo", "foo", "baz"),
      (err: Error) => err.message.includes("2 matches"),
    );
  });

  it("throws when search string is not found", () => {
    throws(
      () => findAndReplace("hello", "goodbye", "x"),
      (err: Error) => err.message.includes("not found"),
    );
  });

  it("throws when content differs semantically", () => {
    throws(
      () => findAndReplace("apples and oranges", "bananas and grapes", "x"),
      (err: Error) => err.message.includes("not found"),
    );
  });

  it("returns 'not found' for empty search string", () => {
    throws(
      () => findAndReplace("content", "", "x"),
      (err: Error) => err.message.includes("not found"),
    );
  });

  it("returns 'not found' for empty content", () => {
    throws(
      () => findAndReplace("", "search", "x"),
      (err: Error) => err.message.includes("not found"),
    );
  });
});
