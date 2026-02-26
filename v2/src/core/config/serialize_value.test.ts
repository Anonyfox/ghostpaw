import { strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import { serializeConfigValue } from "./serialize_value.ts";

describe("serializeConfigValue", () => {
  it("serializes a string as-is", () => {
    strictEqual(serializeConfigValue("hello", "string"), "hello");
  });

  it("serializes empty string", () => {
    strictEqual(serializeConfigValue("", "string"), "");
  });

  it("rejects non-string for string type", () => {
    throws(() => serializeConfigValue(42 as unknown as string, "string"), /must be a string/i);
  });

  it("serializes an integer to its string representation", () => {
    strictEqual(serializeConfigValue(42, "integer"), "42");
  });

  it("serializes zero integer", () => {
    strictEqual(serializeConfigValue(0, "integer"), "0");
  });

  it("serializes negative integer", () => {
    strictEqual(serializeConfigValue(-5, "integer"), "-5");
  });

  it("rejects float for integer type", () => {
    throws(() => serializeConfigValue(3.5, "integer"), /must be an integer/i);
  });

  it("rejects string for integer type", () => {
    throws(() => serializeConfigValue("42" as unknown as number, "integer"), /must be an integer/i);
  });

  it("rejects NaN for integer type", () => {
    throws(() => serializeConfigValue(Number.NaN, "integer"), /must be an integer/i);
  });

  it("rejects Infinity for integer type", () => {
    throws(() => serializeConfigValue(Number.POSITIVE_INFINITY, "integer"), /must be an integer/i);
  });

  it("serializes a number (float) to string", () => {
    strictEqual(serializeConfigValue(3.14, "number"), "3.14");
  });

  it("serializes zero number", () => {
    strictEqual(serializeConfigValue(0, "number"), "0");
  });

  it("serializes negative number", () => {
    strictEqual(serializeConfigValue(-0.5, "number"), "-0.5");
  });

  it("serializes integer as number type", () => {
    strictEqual(serializeConfigValue(42, "number"), "42");
  });

  it("rejects NaN for number type", () => {
    throws(() => serializeConfigValue(Number.NaN, "number"), /must be a finite number/i);
  });

  it("rejects Infinity for number type", () => {
    throws(
      () => serializeConfigValue(Number.POSITIVE_INFINITY, "number"),
      /must be a finite number/i,
    );
  });

  it("rejects string for number type", () => {
    throws(
      () => serializeConfigValue("3.14" as unknown as number, "number"),
      /must be a finite number/i,
    );
  });

  it("serializes true to 'true'", () => {
    strictEqual(serializeConfigValue(true, "boolean"), "true");
  });

  it("serializes false to 'false'", () => {
    strictEqual(serializeConfigValue(false, "boolean"), "false");
  });

  it("rejects string for boolean type", () => {
    throws(
      () => serializeConfigValue("true" as unknown as boolean, "boolean"),
      /must be a boolean/i,
    );
  });

  it("rejects number for boolean type", () => {
    throws(() => serializeConfigValue(1 as unknown as boolean, "boolean"), /must be a boolean/i);
  });

  it("roundtrips with parseConfigValue for all types", async () => {
    const { parseConfigValue } = await import("./parse_value.ts");

    strictEqual(parseConfigValue(serializeConfigValue("hello", "string"), "string"), "hello");
    strictEqual(parseConfigValue(serializeConfigValue(42, "integer"), "integer"), 42);
    strictEqual(parseConfigValue(serializeConfigValue(3.14, "number"), "number"), 3.14);
    strictEqual(parseConfigValue(serializeConfigValue(true, "boolean"), "boolean"), true);
    strictEqual(parseConfigValue(serializeConfigValue(false, "boolean"), "boolean"), false);
  });
});
