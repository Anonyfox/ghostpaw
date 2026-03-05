import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { splitMessage } from "./split_message.ts";

describe("splitMessage", () => {
  it("returns single-element array for short messages", () => {
    deepStrictEqual(splitMessage("hello"), ["hello"]);
  });

  it("returns single-element array for exactly 4096 chars", () => {
    const text = "x".repeat(4096);
    const parts = splitMessage(text);
    strictEqual(parts.length, 1);
    strictEqual(parts[0]!.length, 4096);
  });

  it("splits long messages at newline boundaries", () => {
    const line = "a".repeat(2000);
    const text = `${line}\n${line}\n${line}`;
    const parts = splitMessage(text);
    ok(parts.length >= 2, `expected >=2 parts, got ${parts.length}`);
    for (const part of parts) {
      ok(part.length <= 4096, `part exceeds max: ${part.length}`);
    }
  });

  it("splits at space when no newlines available", () => {
    const words = Array.from({ length: 1000 }, () => "word").join(" ");
    const parts = splitMessage(words);
    ok(parts.length >= 2);
    for (const part of parts) {
      ok(part.length <= 4096);
    }
  });

  it("hard-splits when no whitespace at all", () => {
    const text = "x".repeat(10000);
    const parts = splitMessage(text);
    ok(parts.length >= 3);
    strictEqual(parts[0]!.length, 4096);
    const total = parts.reduce((sum, p) => sum + p.length, 0);
    strictEqual(total, 10000);
  });

  it("handles empty string", () => {
    deepStrictEqual(splitMessage(""), [""]);
  });
});
