import assert from "node:assert";
import { describe, it } from "node:test";
import { canonicalizeKey } from "./canonicalize.ts";

describe("settings/canonicalize", () => {
  it("uppercases input", () => {
    assert.strictEqual(canonicalizeKey("my_thing"), "MY_THING");
  });

  it("replaces non-alphanumeric with underscores", () => {
    assert.strictEqual(canonicalizeKey("my-custom.key"), "MY_CUSTOM_KEY");
  });

  it("strips leading/trailing underscores", () => {
    assert.strictEqual(canonicalizeKey("_test_"), "TEST");
  });

  it("external secret keys stay as-is", () => {
    assert.strictEqual(canonicalizeKey("ANTHROPIC_API_KEY"), "ANTHROPIC_API_KEY");
    assert.strictEqual(canonicalizeKey("OPENAI_API_KEY"), "OPENAI_API_KEY");
    assert.strictEqual(canonicalizeKey("XAI_API_KEY"), "XAI_API_KEY");
    assert.strictEqual(canonicalizeKey("BRAVE_API_KEY"), "BRAVE_API_KEY");
    assert.strictEqual(canonicalizeKey("TELEGRAM_BOT_TOKEN"), "TELEGRAM_BOT_TOKEN");
  });

  it("GHOSTPAW_ prefixed keys stay as-is", () => {
    assert.strictEqual(canonicalizeKey("GHOSTPAW_MODEL"), "GHOSTPAW_MODEL");
    assert.strictEqual(canonicalizeKey("GHOSTPAW_MODEL_SMALL"), "GHOSTPAW_MODEL_SMALL");
    assert.strictEqual(canonicalizeKey("GHOSTPAW_SCRIBE_LOOKBACK"), "GHOSTPAW_SCRIBE_LOOKBACK");
  });

  it("shorthand resolves to GHOSTPAW_ prefixed known keys", () => {
    assert.strictEqual(canonicalizeKey("model"), "GHOSTPAW_MODEL");
    assert.strictEqual(canonicalizeKey("MODEL"), "GHOSTPAW_MODEL");
    assert.strictEqual(canonicalizeKey("scribe_lookback"), "GHOSTPAW_SCRIBE_LOOKBACK");
    assert.strictEqual(canonicalizeKey("bash_timeout_s"), "GHOSTPAW_BASH_TIMEOUT_S");
  });

  it("unknown keys are uppercased as-is", () => {
    assert.strictEqual(canonicalizeKey("MY_CUSTOM_THING"), "MY_CUSTOM_THING");
    assert.strictEqual(canonicalizeKey("my_custom_thing"), "MY_CUSTOM_THING");
  });

  it("trims whitespace", () => {
    assert.strictEqual(canonicalizeKey("  model  "), "GHOSTPAW_MODEL");
  });
});
