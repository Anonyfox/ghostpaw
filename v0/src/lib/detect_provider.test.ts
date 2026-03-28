import assert from "node:assert";
import { describe, it } from "node:test";
import { chatConfigForModel } from "./detect_provider.ts";

describe("chatConfigForModel", () => {
  it("sets anthropic provider for claude models", () => {
    const config = chatConfigForModel("claude-sonnet-4-20250514");
    assert.strictEqual(config.model, "claude-sonnet-4-20250514");
    assert.strictEqual(config.defaults?.provider, "anthropic");
  });

  it("sets openai provider for o4-mini", () => {
    const config = chatConfigForModel("o4-mini");
    assert.strictEqual(config.model, "o4-mini");
    assert.strictEqual(config.defaults?.provider, "openai");
  });

  it("sets openai provider for any o4 variant", () => {
    const config = chatConfigForModel("o4-preview");
    assert.strictEqual(config.defaults?.provider, "openai");
  });

  it("sets xai provider for grok models", () => {
    const config = chatConfigForModel("grok-3-mini");
    assert.strictEqual(config.model, "grok-3-mini");
    assert.strictEqual(config.defaults?.provider, "xai");
  });

  it("sets openai provider for gpt models", () => {
    const config = chatConfigForModel("gpt-4.1-mini");
    assert.strictEqual(config.model, "gpt-4.1-mini");
    assert.strictEqual(config.defaults?.provider, "openai");
  });
});
