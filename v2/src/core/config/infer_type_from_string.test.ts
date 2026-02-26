import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { inferTypeFromString } from "./infer_type_from_string.ts";

describe("inferTypeFromString", () => {
  it("infers boolean from exact true/false", () => {
    strictEqual(inferTypeFromString("true"), "boolean");
    strictEqual(inferTypeFromString("false"), "boolean");
  });

  it("infers integer from clean digit strings", () => {
    strictEqual(inferTypeFromString("0"), "integer");
    strictEqual(inferTypeFromString("1"), "integer");
    strictEqual(inferTypeFromString("42"), "integer");
    strictEqual(inferTypeFromString("999999"), "integer");
  });

  it("infers integer from negative numbers", () => {
    strictEqual(inferTypeFromString("-1"), "integer");
    strictEqual(inferTypeFromString("-5"), "integer");
    strictEqual(inferTypeFromString("-0"), "integer");
  });

  it("infers number from decimal floats", () => {
    strictEqual(inferTypeFromString("3.14"), "number");
    strictEqual(inferTypeFromString("0.5"), "number");
    strictEqual(inferTypeFromString("-2.7"), "number");
    strictEqual(inferTypeFromString("100.0"), "number");
  });

  it("infers string from plain text", () => {
    strictEqual(inferTypeFromString("hello"), "string");
    strictEqual(inferTypeFromString("claude-sonnet-4-6"), "string");
    strictEqual(inferTypeFromString(""), "string");
    strictEqual(inferTypeFromString(" "), "string");
  });

  it("treats leading zeros as strings, not integers", () => {
    strictEqual(inferTypeFromString("007"), "string");
    strictEqual(inferTypeFromString("00"), "string");
    strictEqual(inferTypeFromString("01"), "string");
    strictEqual(inferTypeFromString("-007"), "string");
  });

  it("treats scientific notation as string", () => {
    strictEqual(inferTypeFromString("1e5"), "string");
    strictEqual(inferTypeFromString("1E5"), "string");
    strictEqual(inferTypeFromString("1.5e10"), "string");
  });

  it("treats boolean-like but wrong-case strings as string", () => {
    strictEqual(inferTypeFromString("True"), "string");
    strictEqual(inferTypeFromString("FALSE"), "string");
    strictEqual(inferTypeFromString("TRUE"), "string");
    strictEqual(inferTypeFromString("yes"), "string");
    strictEqual(inferTypeFromString("no"), "string");
  });

  it("treats partial numeric formats as string", () => {
    strictEqual(inferTypeFromString(".5"), "string");
    strictEqual(inferTypeFromString("3."), "string");
    strictEqual(inferTypeFromString("--5"), "string");
    strictEqual(inferTypeFromString("1,000"), "string");
    strictEqual(inferTypeFromString("$5"), "string");
  });

  it("treats whitespace-padded numbers as string", () => {
    strictEqual(inferTypeFromString(" 42"), "string");
    strictEqual(inferTypeFromString("42 "), "string");
    strictEqual(inferTypeFromString(" 42 "), "string");
  });
});
