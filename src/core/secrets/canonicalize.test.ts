import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { canonicalKeyName } from "./canonicalize.ts";

describe("canonicalKeyName", () => {
  it("maps ANTHROPIC_API_KEY to API_KEY_ANTHROPIC", () => {
    strictEqual(canonicalKeyName("ANTHROPIC_API_KEY"), "API_KEY_ANTHROPIC");
  });

  it("maps OPENAI_API_KEY to API_KEY_OPENAI", () => {
    strictEqual(canonicalKeyName("OPENAI_API_KEY"), "API_KEY_OPENAI");
  });

  it("maps XAI_API_KEY to API_KEY_XAI", () => {
    strictEqual(canonicalKeyName("XAI_API_KEY"), "API_KEY_XAI");
  });

  it("passes canonical names through unchanged", () => {
    strictEqual(canonicalKeyName("API_KEY_ANTHROPIC"), "API_KEY_ANTHROPIC");
    strictEqual(canonicalKeyName("API_KEY_OPENAI"), "API_KEY_OPENAI");
    strictEqual(canonicalKeyName("API_KEY_XAI"), "API_KEY_XAI");
  });

  it("passes search keys through unchanged (no aliases)", () => {
    strictEqual(canonicalKeyName("BRAVE_API_KEY"), "BRAVE_API_KEY");
    strictEqual(canonicalKeyName("TAVILY_API_KEY"), "TAVILY_API_KEY");
    strictEqual(canonicalKeyName("SERPER_API_KEY"), "SERPER_API_KEY");
  });

  it("passes unknown keys through unchanged", () => {
    strictEqual(canonicalKeyName("TELEGRAM_TOKEN"), "TELEGRAM_TOKEN");
    strictEqual(canonicalKeyName("CUSTOM_SECRET"), "CUSTOM_SECRET");
  });

  it("passes empty string through unchanged", () => {
    strictEqual(canonicalKeyName(""), "");
  });
});
