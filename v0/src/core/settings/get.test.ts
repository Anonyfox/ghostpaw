import assert from "node:assert";
import { afterEach, describe, it } from "node:test";
import { getSetting, getSettingBool, getSettingInt } from "./get.ts";

describe("settings/get", () => {
  afterEach(() => {
    delete process.env.GHOSTPAW_MODEL;
    delete process.env.GHOSTPAW_SCRIBE_LOOKBACK;
    delete process.env.GHOSTPAW_INTERCEPTOR_ENABLED;
    delete process.env.MY_CUSTOM_THING;
  });

  it("getSetting returns the env var value (key IS env name)", () => {
    process.env.GHOSTPAW_MODEL = "gpt-5.4";
    assert.strictEqual(getSetting("GHOSTPAW_MODEL"), "gpt-5.4");
  });

  it("getSetting returns undefined for unset env var", () => {
    assert.strictEqual(getSetting("GHOSTPAW_MODEL"), undefined);
  });

  it("getSetting returns undefined for empty string", () => {
    process.env.GHOSTPAW_MODEL = "";
    assert.strictEqual(getSetting("GHOSTPAW_MODEL"), undefined);
  });

  it("getSettingInt parses integers", () => {
    process.env.GHOSTPAW_SCRIBE_LOOKBACK = "5";
    assert.strictEqual(getSettingInt("GHOSTPAW_SCRIBE_LOOKBACK"), 5);
  });

  it("getSettingInt returns undefined for non-integer", () => {
    process.env.GHOSTPAW_SCRIBE_LOOKBACK = "abc";
    assert.strictEqual(getSettingInt("GHOSTPAW_SCRIBE_LOOKBACK"), undefined);
  });

  it("getSettingInt returns undefined for unset", () => {
    assert.strictEqual(getSettingInt("GHOSTPAW_SCRIBE_LOOKBACK"), undefined);
  });

  it("getSettingBool parses true", () => {
    process.env.GHOSTPAW_INTERCEPTOR_ENABLED = "true";
    assert.strictEqual(getSettingBool("GHOSTPAW_INTERCEPTOR_ENABLED"), true);
  });

  it("getSettingBool parses 1 as true", () => {
    process.env.GHOSTPAW_INTERCEPTOR_ENABLED = "1";
    assert.strictEqual(getSettingBool("GHOSTPAW_INTERCEPTOR_ENABLED"), true);
  });

  it("getSettingBool parses false", () => {
    process.env.GHOSTPAW_INTERCEPTOR_ENABLED = "false";
    assert.strictEqual(getSettingBool("GHOSTPAW_INTERCEPTOR_ENABLED"), false);
  });

  it("getSettingBool returns undefined for unset", () => {
    assert.strictEqual(getSettingBool("GHOSTPAW_INTERCEPTOR_ENABLED"), undefined);
  });
});
