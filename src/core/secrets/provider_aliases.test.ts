import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { PROVIDER_ALIASES } from "./provider_aliases.ts";

describe("PROVIDER_ALIASES", () => {
  it("maps ANTHROPIC_API_KEY to API_KEY_ANTHROPIC", () => {
    strictEqual(PROVIDER_ALIASES.ANTHROPIC_API_KEY, "API_KEY_ANTHROPIC");
  });

  it("maps OPENAI_API_KEY to API_KEY_OPENAI", () => {
    strictEqual(PROVIDER_ALIASES.OPENAI_API_KEY, "API_KEY_OPENAI");
  });

  it("maps XAI_API_KEY to API_KEY_XAI", () => {
    strictEqual(PROVIDER_ALIASES.XAI_API_KEY, "API_KEY_XAI");
  });

  it("contains exactly 3 entries (one per LLM provider alias)", () => {
    strictEqual(Object.keys(PROVIDER_ALIASES).length, 3);
  });
});
