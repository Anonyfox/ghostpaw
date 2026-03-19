import { strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import { validateMemberName } from "./validate_member_name.ts";

describe("validateMemberName", () => {
  it("returns trimmed name for a valid input", () => {
    strictEqual(validateMemberName("Alice"), "Alice");
  });

  it("trims surrounding whitespace", () => {
    strictEqual(validateMemberName("  Bob  "), "Bob");
  });

  it("allows names with spaces, unicode, and mixed case", () => {
    strictEqual(validateMemberName("Dr. Müller"), "Dr. Müller");
  });

  it("allows names up to 128 characters", () => {
    const long = "a".repeat(128);
    strictEqual(validateMemberName(long), long);
  });

  it("throws on empty string", () => {
    throws(() => validateMemberName(""), /non-empty/);
  });

  it("throws on whitespace-only string", () => {
    throws(() => validateMemberName("   \t\n  "), /non-empty/);
  });

  it("throws on name exceeding 128 characters", () => {
    const tooLong = "a".repeat(129);
    throws(() => validateMemberName(tooLong), /at most 128/);
  });

  it("throws on non-string input", () => {
    throws(() => validateMemberName(null as unknown as string), /non-empty/);
    throws(() => validateMemberName(undefined as unknown as string), /non-empty/);
    throws(() => validateMemberName(42 as unknown as string), /non-empty/);
  });
});
