import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isProviderId,
  MODELS_SOURCES,
  PROVIDER_DISPLAY_NAMES,
  PROVIDER_IDS,
  PROVIDER_SECRET_KEYS,
} from "./types.ts";

describe("PROVIDER_IDS", () => {
  it("contains exactly the three supported providers", () => {
    deepStrictEqual([...PROVIDER_IDS], ["anthropic", "openai", "xai"]);
  });
});

describe("PROVIDER_DISPLAY_NAMES", () => {
  it("maps every provider ID to a human-readable name", () => {
    for (const id of PROVIDER_IDS) {
      ok(PROVIDER_DISPLAY_NAMES[id], `missing display name for ${id}`);
      strictEqual(typeof PROVIDER_DISPLAY_NAMES[id], "string");
    }
  });
});

describe("PROVIDER_SECRET_KEYS", () => {
  it("maps every provider ID to the correct secret key", () => {
    strictEqual(PROVIDER_SECRET_KEYS.anthropic, "API_KEY_ANTHROPIC");
    strictEqual(PROVIDER_SECRET_KEYS.openai, "API_KEY_OPENAI");
    strictEqual(PROVIDER_SECRET_KEYS.xai, "API_KEY_XAI");
  });
});

describe("MODELS_SOURCES", () => {
  it("contains live and static", () => {
    deepStrictEqual([...MODELS_SOURCES], ["live", "static"]);
  });
});

describe("isProviderId", () => {
  it("returns true for valid provider IDs", () => {
    ok(isProviderId("anthropic"));
    ok(isProviderId("openai"));
    ok(isProviderId("xai"));
  });

  it("returns false for unknown strings", () => {
    ok(!isProviderId("google"));
    ok(!isProviderId(""));
    ok(!isProviderId("ANTHROPIC"));
  });
});
