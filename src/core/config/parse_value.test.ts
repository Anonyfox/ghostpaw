import { strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import { parseConfigValue } from "./parse_value.ts";

describe("parseConfigValue", () => {
  it("returns a string value as-is", () => {
    strictEqual(parseConfigValue("hello", "string"), "hello");
  });

  it("returns empty string for string type", () => {
    strictEqual(parseConfigValue("", "string"), "");
  });

  it("parses a valid integer", () => {
    strictEqual(parseConfigValue("42", "integer"), 42);
  });

  it("parses zero as integer", () => {
    strictEqual(parseConfigValue("0", "integer"), 0);
  });

  it("parses negative integer", () => {
    strictEqual(parseConfigValue("-5", "integer"), -5);
  });

  it("parses large integer", () => {
    strictEqual(parseConfigValue("1000000", "integer"), 1_000_000);
  });

  it("rejects float string for integer type", () => {
    throws(() => parseConfigValue("3.5", "integer"), /not a valid integer/i);
  });

  it("rejects non-numeric string for integer type", () => {
    throws(() => parseConfigValue("banana", "integer"), /not a valid integer/i);
  });

  it("rejects empty string for integer type", () => {
    throws(() => parseConfigValue("", "integer"), /not a valid integer/i);
  });

  it("rejects whitespace-only string for integer type", () => {
    throws(() => parseConfigValue("  ", "integer"), /not a valid integer/i);
  });

  it("rejects integer with trailing text", () => {
    throws(() => parseConfigValue("42abc", "integer"), /not a valid integer/i);
  });

  it("parses a valid number (float)", () => {
    strictEqual(parseConfigValue("3.14", "number"), 3.14);
  });

  it("parses zero as number", () => {
    strictEqual(parseConfigValue("0", "number"), 0);
  });

  it("parses negative number", () => {
    strictEqual(parseConfigValue("-0.5", "number"), -0.5);
  });

  it("parses integer string as number", () => {
    strictEqual(parseConfigValue("42", "number"), 42);
  });

  it("rejects non-numeric string for number type", () => {
    throws(() => parseConfigValue("banana", "number"), /not a valid number/i);
  });

  it("rejects empty string for number type", () => {
    throws(() => parseConfigValue("", "number"), /not a valid number/i);
  });

  it("rejects Infinity for number type", () => {
    throws(() => parseConfigValue("Infinity", "number"), /not a valid number/i);
  });

  it("rejects NaN string for number type", () => {
    throws(() => parseConfigValue("NaN", "number"), /not a valid number/i);
  });

  it("parses 'true' as boolean true", () => {
    strictEqual(parseConfigValue("true", "boolean"), true);
  });

  it("parses 'false' as boolean false", () => {
    strictEqual(parseConfigValue("false", "boolean"), false);
  });

  it("rejects 'True' (case-sensitive) for boolean type", () => {
    throws(() => parseConfigValue("True", "boolean"), /not a valid boolean/i);
  });

  it("rejects '1' for boolean type", () => {
    throws(() => parseConfigValue("1", "boolean"), /not a valid boolean/i);
  });

  it("rejects 'yes' for boolean type", () => {
    throws(() => parseConfigValue("yes", "boolean"), /not a valid boolean/i);
  });

  it("rejects empty string for boolean type", () => {
    throws(() => parseConfigValue("", "boolean"), /not a valid boolean/i);
  });
});
