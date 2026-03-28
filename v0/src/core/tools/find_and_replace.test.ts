import assert from "node:assert";
import { describe, it } from "node:test";
import { findAndReplace } from "./find_and_replace.ts";

describe("findAndReplace", () => {
  it("performs exact replacement", () => {
    const result = findAndReplace("hello world", "world", "earth");
    assert.strictEqual(result.newContent, "hello earth");
    assert.strictEqual(result.matchKind, "exact");
  });

  it("throws on ambiguous matches", () => {
    assert.throws(() => findAndReplace("aa bb aa cc", "aa", "xx"), /matches/);
  });

  it("throws when search string not found", () => {
    assert.throws(() => findAndReplace("hello world", "missing", "new"), /not found/);
  });

  it("handles multiline exact match", () => {
    const content = "line1\nline2\nline3";
    const result = findAndReplace(content, "line2", "replaced");
    assert.strictEqual(result.newContent, "line1\nreplaced\nline3");
  });

  it("performs fuzzy match on whitespace differences", () => {
    const content = "function foo() {\n  return 1;\n}";
    const search = "function foo() {\nreturn 1;\n}";
    const result = findAndReplace(content, search, "function bar() {\n  return 2;\n}");
    assert.strictEqual(result.matchKind, "fuzzy");
    assert.ok(result.newContent.includes("bar"));
  });
});
