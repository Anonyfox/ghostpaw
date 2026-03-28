import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { stripAnsi, visibleLength, wrapText } from "./wrap_text.ts";

describe("stripAnsi", () => {
  it("removes ANSI escape sequences from text", () => {
    strictEqual(stripAnsi("\x1b[1mhello\x1b[0m"), "hello");
  });

  it("returns plain text unchanged", () => {
    strictEqual(stripAnsi("hello"), "hello");
  });
});

describe("visibleLength", () => {
  it("counts only visible characters", () => {
    strictEqual(visibleLength("\x1b[36mhello\x1b[0m"), 5);
  });

  it("handles strings without ANSI codes", () => {
    strictEqual(visibleLength("hello"), 5);
  });
});

describe("wrapText", () => {
  it("returns short lines unchanged", () => {
    deepStrictEqual(wrapText("hello", 80), ["hello"]);
  });

  it("wraps long lines at word boundaries", () => {
    deepStrictEqual(wrapText("hello world foo", 11), ["hello world", "foo"]);
  });

  it("preserves hard newlines", () => {
    deepStrictEqual(wrapText("a\nb\nc", 80), ["a", "b", "c"]);
  });

  it("breaks words that exceed the width", () => {
    const result = wrapText("abcdefghij", 5);
    deepStrictEqual(result, ["abcde", "fghij"]);
  });

  it("handles empty string", () => {
    deepStrictEqual(wrapText("", 80), [""]);
  });

  it("ignores ANSI codes when measuring width", () => {
    const styled = "\x1b[1mhello world\x1b[0m";
    const result = wrapText(styled, 5);
    strictEqual(result.length, 2);
  });

  it("wraps multiple words correctly", () => {
    const result = wrapText("one two three four five", 10);
    deepStrictEqual(result, ["one two", "three four", "five"]);
  });
});
