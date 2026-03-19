import { doesNotThrow, throws } from "node:assert";
import { describe, it } from "node:test";
import { validateSoulName } from "./validate_soul_name.ts";

describe("validateSoulName", () => {
  it("accepts valid simple names", () => {
    doesNotThrow(() => validateSoulName("ghostpaw"));
    doesNotThrow(() => validateSoulName("mentor"));
    doesNotThrow(() => validateSoulName("a"));
  });

  it("accepts valid hyphenated names", () => {
    doesNotThrow(() => validateSoulName("js-engineer"));
    doesNotThrow(() => validateSoulName("prompt-engineer"));
    doesNotThrow(() => validateSoulName("my-cool-soul"));
    doesNotThrow(() => validateSoulName("code-reviewer-3"));
  });

  it("accepts names with digits", () => {
    doesNotThrow(() => validateSoulName("soul2"));
    doesNotThrow(() => validateSoulName("v3-agent"));
  });

  it("rejects empty string", () => {
    throws(() => validateSoulName(""), /non-empty/);
  });

  it("rejects uppercase letters", () => {
    throws(() => validateSoulName("Ghostpaw"), /invalid/i);
    throws(() => validateSoulName("JS-Engineer"), /invalid/i);
  });

  it("rejects names starting with a digit", () => {
    throws(() => validateSoulName("3soul"), /invalid/i);
  });

  it("rejects names starting with a hyphen", () => {
    throws(() => validateSoulName("-bad"), /invalid/i);
  });

  it("rejects names ending with a hyphen", () => {
    throws(() => validateSoulName("bad-"), /invalid/i);
  });

  it("rejects consecutive hyphens", () => {
    throws(() => validateSoulName("bad--name"), /invalid/i);
  });

  it("rejects spaces", () => {
    throws(() => validateSoulName("bad name"), /invalid/i);
  });

  it("rejects special characters", () => {
    throws(() => validateSoulName("bad!name"), /invalid/i);
    throws(() => validateSoulName("bad.name"), /invalid/i);
    throws(() => validateSoulName("bad_name"), /invalid/i);
  });

  it("rejects names exceeding 64 characters", () => {
    const long = `a${"-abcdef".repeat(11)}`;
    throws(() => validateSoulName(long), /at most 64/);
  });

  it("accepts names at exactly 64 characters", () => {
    const exact = `a${"b".repeat(63)}`;
    doesNotThrow(() => validateSoulName(exact));
  });

  it("rejects non-string input", () => {
    throws(() => validateSoulName(null as unknown as string), /non-empty/);
    throws(() => validateSoulName(undefined as unknown as string), /non-empty/);
    throws(() => validateSoulName(42 as unknown as string), /non-empty/);
  });
});
