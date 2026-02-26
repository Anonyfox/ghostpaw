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

  it("accepts valid max_tokens_per_session", () => {
    doesNotThrow(() => validateKnownValue("max_tokens_per_session", 200_000));
  });

  it("accepts 1 as max_tokens_per_session", () => {
    doesNotThrow(() => validateKnownValue("max_tokens_per_session", 1));
  });

  it("rejects zero for max_tokens_per_session", () => {
    throws(() => validateKnownValue("max_tokens_per_session", 0), /constraint/i);
  });

  it("rejects negative for max_tokens_per_session", () => {
    throws(() => validateKnownValue("max_tokens_per_session", -1), /constraint/i);
  });

  it("accepts valid max_tokens_per_day", () => {
    doesNotThrow(() => validateKnownValue("max_tokens_per_day", 1_000_000));
  });

  it("rejects zero for max_tokens_per_day", () => {
    throws(() => validateKnownValue("max_tokens_per_day", 0), /constraint/i);
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
      validateKnownValue("max_tokens_per_session", 0);
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.includes("Max Tokens Per Session")) {
        throw new Error(`Expected label in error message, got: ${msg}`);
      }
    }
  });
});
