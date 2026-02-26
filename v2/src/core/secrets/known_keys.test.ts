import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { KNOWN_KEYS } from "./known_keys.ts";

describe("KNOWN_KEYS", () => {
  it("contains exactly 3 LLM and 3 search providers", () => {
    const llm = KNOWN_KEYS.filter((k) => k.category === "llm");
    const search = KNOWN_KEYS.filter((k) => k.category === "search");
    strictEqual(llm.length, 3);
    strictEqual(search.length, 3);
    strictEqual(KNOWN_KEYS.length, 6);
  });

  it("has Anthropic, OpenAI, and xAI as LLM providers", () => {
    const labels = KNOWN_KEYS.filter((k) => k.category === "llm").map((k) => k.label);
    deepStrictEqual(labels, ["Anthropic", "OpenAI", "xAI"]);
  });

  it("has Brave, Tavily, and Serper as search providers", () => {
    const labels = KNOWN_KEYS.filter((k) => k.category === "search").map((k) => k.label);
    deepStrictEqual(labels, ["Brave Search", "Tavily", "Serper"]);
  });

  it("LLM providers each have exactly one alias", () => {
    for (const k of KNOWN_KEYS.filter((k) => k.category === "llm")) {
      strictEqual(k.aliases.length, 1, `${k.label} should have one alias`);
    }
  });

  it("search providers have no aliases", () => {
    for (const k of KNOWN_KEYS.filter((k) => k.category === "search")) {
      strictEqual(k.aliases.length, 0, `${k.label} should have no aliases`);
    }
  });

  it("every entry has a non-empty canonical name and label", () => {
    for (const k of KNOWN_KEYS) {
      ok(k.canonical.length > 0, "canonical must be non-empty");
      ok(k.label.length > 0, "label must be non-empty");
    }
  });
});
