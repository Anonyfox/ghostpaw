import { doesNotThrow, throws } from "node:assert";
import { describe, it } from "node:test";
import { validateKnownValue } from "./validate_known_value.ts";

describe("validateKnownValue", () => {
  it("accepts a valid default_model string", () => {
    doesNotThrow(() => validateKnownValue("default_model", "claude-sonnet-4-6"));
  });

  it("accepts any non-empty string for default_model", () => {
    doesNotThrow(() => validateKnownValue("default_model", "gpt-4o"));
  });

  it("accepts valid compaction_threshold", () => {
    doesNotThrow(() => validateKnownValue("compaction_threshold", 200_000));
  });

  it("accepts 1 as compaction_threshold", () => {
    doesNotThrow(() => validateKnownValue("compaction_threshold", 1));
  });

  it("rejects zero for compaction_threshold", () => {
    throws(() => validateKnownValue("compaction_threshold", 0), /constraint/i);
  });

  it("rejects negative for compaction_threshold", () => {
    throws(() => validateKnownValue("compaction_threshold", -1), /constraint/i);
  });

  it("accepts zero for warn_at_percentage", () => {
    doesNotThrow(() => validateKnownValue("warn_at_percentage", 0));
  });

  it("accepts 100 for warn_at_percentage", () => {
    doesNotThrow(() => validateKnownValue("warn_at_percentage", 100));
  });

  it("accepts 50 for warn_at_percentage", () => {
    doesNotThrow(() => validateKnownValue("warn_at_percentage", 50));
  });

  it("rejects -1 for warn_at_percentage", () => {
    throws(() => validateKnownValue("warn_at_percentage", -1), /constraint/i);
  });

  it("rejects 101 for warn_at_percentage", () => {
    throws(() => validateKnownValue("warn_at_percentage", 101), /constraint/i);
  });

  it("accepts zero for max_cost_per_day (unlimited)", () => {
    doesNotThrow(() => validateKnownValue("max_cost_per_day", 0));
  });

  it("accepts positive float for max_cost_per_day", () => {
    doesNotThrow(() => validateKnownValue("max_cost_per_day", 5.5));
  });

  it("rejects negative for max_cost_per_day", () => {
    throws(() => validateKnownValue("max_cost_per_day", -0.01), /constraint/i);
  });

  it("is a no-op for unknown custom keys", () => {
    doesNotThrow(() => validateKnownValue("my_custom_key", "anything"));
    doesNotThrow(() => validateKnownValue("my_custom_key", 42));
    doesNotThrow(() => validateKnownValue("my_custom_key", true));
  });

  it("error message includes the key name and label", () => {
    try {
      validateKnownValue("compaction_threshold", 0);
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.includes("Compaction Threshold")) {
        throw new Error(`Expected label in error message, got: ${msg}`);
      }
    }
  });
});
