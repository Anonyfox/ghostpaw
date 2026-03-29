import assert from "node:assert";
import { afterEach, describe, it } from "node:test";
import {
  clearSecretRegistry,
  getSecretValues,
  registerSecretKey,
  unregisterSecretKey,
} from "./scrub.ts";

describe("settings/scrub", () => {
  afterEach(() => {
    clearSecretRegistry();
    delete process.env.TEST_SECRET_A;
    delete process.env.TEST_SECRET_B;
    delete process.env.TEST_SECRET_SHORT;
  });

  it("returns empty array when no secrets registered", () => {
    assert.deepStrictEqual(getSecretValues(), []);
  });

  it("returns values for registered secret env vars", () => {
    process.env.TEST_SECRET_A = "long-enough-value";
    registerSecretKey("TEST_SECRET_A");
    const values = getSecretValues();
    assert.deepStrictEqual(values, ["long-enough-value"]);
  });

  it("filters out values shorter than 8 characters", () => {
    process.env.TEST_SECRET_SHORT = "short";
    registerSecretKey("TEST_SECRET_SHORT");
    assert.deepStrictEqual(getSecretValues(), []);
  });

  it("filters out unset env vars", () => {
    registerSecretKey("TEST_SECRET_NONEXISTENT");
    assert.deepStrictEqual(getSecretValues(), []);
  });

  it("unregisterSecretKey removes the key", () => {
    process.env.TEST_SECRET_A = "long-enough-value";
    registerSecretKey("TEST_SECRET_A");
    assert.strictEqual(getSecretValues().length, 1);
    unregisterSecretKey("TEST_SECRET_A");
    assert.strictEqual(getSecretValues().length, 0);
  });

  it("clearSecretRegistry removes all keys", () => {
    process.env.TEST_SECRET_A = "long-enough-value-a";
    process.env.TEST_SECRET_B = "long-enough-value-b";
    registerSecretKey("TEST_SECRET_A");
    registerSecretKey("TEST_SECRET_B");
    assert.strictEqual(getSecretValues().length, 2);
    clearSecretRegistry();
    assert.strictEqual(getSecretValues().length, 0);
  });
});
