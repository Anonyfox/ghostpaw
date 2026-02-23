import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";

import { generateId, isValidId } from "./ids.js";

describe("generateId", () => {
  it("returns a string", () => {
    strictEqual(typeof generateId(), "string");
  });

  it("returns a non-empty string", () => {
    ok(generateId().length > 0);
  });

  it("produces URL-safe characters only", () => {
    for (let i = 0; i < 100; i++) {
      const id = generateId();
      ok(/^[a-zA-Z0-9_-]+$/.test(id), `ID contains unsafe chars: ${id}`);
    }
  });

  it("produces IDs of consistent length", () => {
    const first = generateId();
    for (let i = 0; i < 50; i++) {
      strictEqual(generateId().length, first.length);
    }
  });

  it("generates unique IDs", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const id = generateId();
      ok(!seen.has(id), `Duplicate ID generated: ${id}`);
      seen.add(id);
    }
  });

  it("accepts a custom byte length", () => {
    const short = generateId(8);
    const long = generateId(32);
    ok(short.length < long.length, `short=${short.length} >= long=${long.length}`);
  });
});

describe("isValidId", () => {
  it("returns true for valid generated IDs", () => {
    for (let i = 0; i < 100; i++) {
      ok(isValidId(generateId()));
    }
  });

  it("returns false for empty string", () => {
    strictEqual(isValidId(""), false);
  });

  it("returns false for strings with spaces", () => {
    strictEqual(isValidId("abc def"), false);
  });

  it("returns false for strings with special characters", () => {
    strictEqual(isValidId("abc!@#"), false);
    strictEqual(isValidId("abc/def"), false);
    strictEqual(isValidId("abc+def"), false);
  });

  it("returns true for URL-safe strings", () => {
    ok(isValidId("abc_def-123"));
    ok(isValidId("ABCxyz_09-"));
  });

  it("returns false for non-string inputs", () => {
    strictEqual(isValidId(null as unknown as string), false);
    strictEqual(isValidId(undefined as unknown as string), false);
    strictEqual(isValidId(42 as unknown as string), false);
  });
});
