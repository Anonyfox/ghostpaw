import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveSessionTitle } from "./derive_session_title.ts";

describe("deriveSessionTitle", () => {
  it("returns short messages unchanged", () => {
    strictEqual(deriveSessionTitle("explain monads"), "explain monads");
  });

  it("returns 'New Chat' for empty input", () => {
    strictEqual(deriveSessionTitle(""), "New Chat");
  });

  it("returns 'New Chat' for whitespace-only input", () => {
    strictEqual(deriveSessionTitle("   \n\t  "), "New Chat");
  });

  it("truncates at word boundary for long messages", () => {
    const long =
      "explain the theory of relativity in simple terms that anyone can understand easily";
    const result = deriveSessionTitle(long);
    strictEqual(result.length <= 53, true);
    strictEqual(result.endsWith("..."), true);
    strictEqual(result.includes("  "), false);
  });

  it("collapses multiple whitespace into single space", () => {
    strictEqual(deriveSessionTitle("hello   world\n\tfoo"), "hello world foo");
  });

  it("returns exactly 50-char messages unchanged", () => {
    const exact = "a".repeat(50);
    strictEqual(deriveSessionTitle(exact), exact);
  });

  it("handles messages just over the limit", () => {
    const msg = "a".repeat(51);
    const result = deriveSessionTitle(msg);
    strictEqual(result.endsWith("..."), true);
    strictEqual(result.length, 53);
  });

  it("cuts at last space when it falls past 40% of max length", () => {
    const msg = "write a haiku about the beauty of the autumn leaves falling gently";
    const result = deriveSessionTitle(msg);
    strictEqual(result.endsWith("..."), true);
    strictEqual(result.includes("  "), false);
    const withoutEllipsis = result.slice(0, -3);
    strictEqual(withoutEllipsis.endsWith(" "), false);
  });
});
