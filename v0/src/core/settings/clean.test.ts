import assert from "node:assert";
import { describe, it } from "node:test";
import { cleanValue } from "./clean.ts";

describe("settings/clean", () => {
  it("trims whitespace", () => {
    assert.strictEqual(cleanValue("  hello  "), "hello");
  });

  it("strips double quotes", () => {
    assert.strictEqual(cleanValue('"sk-ant-12345"'), "sk-ant-12345");
  });

  it("strips single quotes", () => {
    assert.strictEqual(cleanValue("'sk-ant-12345'"), "sk-ant-12345");
  });

  it("strips export VAR= syntax", () => {
    assert.strictEqual(cleanValue('export ANTHROPIC_API_KEY="sk-ant-12345"'), "sk-ant-12345");
  });

  it("strips VAR= syntax without export", () => {
    assert.strictEqual(cleanValue('ANTHROPIC_API_KEY="sk-ant-12345"'), "sk-ant-12345");
  });

  it("strips export VAR= with single quotes", () => {
    assert.strictEqual(cleanValue("export KEY='value'"), "value");
  });

  it("strips VAR= without quotes", () => {
    assert.strictEqual(cleanValue("KEY=value"), "value");
  });

  it("handles empty string", () => {
    assert.strictEqual(cleanValue(""), "");
  });

  it("leaves plain values alone", () => {
    assert.strictEqual(cleanValue("sk-ant-12345"), "sk-ant-12345");
  });

  it("handles export with spaces around =", () => {
    assert.strictEqual(cleanValue("export KEY = value"), "value");
  });
});
