import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { cleanKeyValue } from "./clean.ts";

describe("cleanKeyValue", () => {
  it("passes through a clean value unchanged", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", "tvly-abc123");
    strictEqual(r.value, "tvly-abc123");
    strictEqual(r.warning, undefined);
  });

  it("trims leading and trailing whitespace", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", "  tvly-abc123  \n");
    strictEqual(r.value, "tvly-abc123");
    strictEqual(r.warning, undefined);
  });

  it("strips surrounding double quotes", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", '"tvly-abc123"');
    strictEqual(r.value, "tvly-abc123");
  });

  it("strips surrounding single quotes", () => {
    const r = cleanKeyValue("BRAVE_API_KEY", "'BSAtest123'");
    strictEqual(r.value, "BSAtest123");
  });

  it("strips surrounding backtick quotes", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", "`tvly-key`");
    strictEqual(r.value, "tvly-key");
  });

  it("does not strip mismatched quotes", () => {
    const r = cleanKeyValue("CUSTOM_KEY", "\"value'");
    strictEqual(r.value, "\"value'");
  });

  it("extracts value from KEY=value assignment", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", "TAVILY_API_KEY=tvly-abc123");
    strictEqual(r.value, "tvly-abc123");
  });

  it("extracts value from export KEY=value with double quotes", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", 'export TAVILY_API_KEY="tvly-abc123"');
    strictEqual(r.value, "tvly-abc123");
  });

  it("extracts value from export KEY=value with single quotes", () => {
    const r = cleanKeyValue("BRAVE_API_KEY", "export BRAVE_API_KEY='BSAtest'");
    strictEqual(r.value, "BSAtest");
  });

  it("returns warning for empty value after trimming", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", "   ");
    strictEqual(r.value, "");
    strictEqual(r.warning, "Empty value");
  });

  it("returns warning for value that becomes empty after quote stripping", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", '""');
    strictEqual(r.value, "");
    strictEqual(r.warning, "Empty value");
  });

  it("warns when Anthropic slot receives an OpenAI-prefixed key", () => {
    const r = cleanKeyValue("API_KEY_ANTHROPIC", "sk-proj-abc123");
    strictEqual(r.value, "sk-proj-abc123");
    ok(r.warning!.includes("OpenAI"));
  });

  it("warns when OpenAI slot receives an Anthropic-prefixed key", () => {
    const r = cleanKeyValue("API_KEY_OPENAI", "sk-ant-abc123");
    ok(r.warning!.includes("Anthropic"));
  });

  it("warns when xAI slot receives an OpenAI-prefixed key", () => {
    const r = cleanKeyValue("API_KEY_XAI", "sk-abc123");
    ok(r.warning!.includes("OpenAI"));
  });

  it("warns when Brave slot receives a Tavily-prefixed key", () => {
    const r = cleanKeyValue("BRAVE_API_KEY", "tvly-wrong");
    ok(r.warning!.includes("Tavily"));
  });

  it("warns when Tavily slot receives a Brave-prefixed key", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", "BSAnot-tavily");
    ok(r.warning!.includes("Brave"));
  });

  it("warns when known provider prefix doesn't match (no prefix match at all)", () => {
    const r = cleanKeyValue("API_KEY_ANTHROPIC", "random-key-value");
    ok(r.warning!.includes("sk-ant-"));
  });

  it("accepts valid Anthropic prefix without warning", () => {
    const r = cleanKeyValue("API_KEY_ANTHROPIC", "sk-ant-abc123");
    strictEqual(r.warning, undefined);
  });

  it("accepts valid OpenAI prefix without warning", () => {
    const r = cleanKeyValue("API_KEY_OPENAI", "sk-proj-abc123");
    strictEqual(r.warning, undefined);
  });

  it("accepts valid xAI prefix without warning", () => {
    const r = cleanKeyValue("API_KEY_XAI", "xai-abc123");
    strictEqual(r.warning, undefined);
  });

  it("accepts valid Brave prefix without warning", () => {
    const r = cleanKeyValue("BRAVE_API_KEY", "BSAabc123");
    strictEqual(r.warning, undefined);
  });

  it("accepts valid Tavily prefix without warning", () => {
    const r = cleanKeyValue("TAVILY_API_KEY", "tvly-abc123");
    strictEqual(r.warning, undefined);
  });

  it("skips prefix validation for Serper (unknown format)", () => {
    const r = cleanKeyValue("SERPER_API_KEY", "any-format-key");
    strictEqual(r.warning, undefined);
  });

  it("skips prefix validation for unknown key names", () => {
    const r = cleanKeyValue("CUSTOM_KEY", "whatever-value");
    strictEqual(r.warning, undefined);
  });

  it("handles very long input strings", () => {
    const long = `tvly-${"x".repeat(10000)}`;
    const r = cleanKeyValue("TAVILY_API_KEY", long);
    strictEqual(r.value, long);
    strictEqual(r.warning, undefined);
  });

  it("handles unicode in values", () => {
    const r = cleanKeyValue("CUSTOM_KEY", "key-with-émojis-🔑");
    strictEqual(r.value, "key-with-émojis-🔑");
  });

  it("handles null bytes in input by preserving them", () => {
    const r = cleanKeyValue("CUSTOM_KEY", "before\x00after");
    strictEqual(r.value, "before\x00after");
  });
});
