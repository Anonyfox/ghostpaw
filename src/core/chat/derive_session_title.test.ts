import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveSessionTitle } from "./derive_session_title.ts";

describe("deriveSessionTitle", () => {
  it("returns short messages unchanged", () => {
    strictEqual(deriveSessionTitle("Hello world"), "Hello world");
  });

  it("returns 'New Chat' for empty or whitespace input", () => {
    strictEqual(deriveSessionTitle(""), "New Chat");
    strictEqual(deriveSessionTitle("   "), "New Chat");
  });

  it("truncates long messages at word boundary with ellipsis", () => {
    const long =
      "This is a much longer message that exceeds the fifty character limit for session titles";
    const result = deriveSessionTitle(long);
    ok(result.length <= 53); // 50 + "..."
    ok(result.endsWith("..."));
  });
});
