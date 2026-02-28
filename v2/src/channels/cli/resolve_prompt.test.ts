import { strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import { resolvePrompt } from "./resolve_prompt.ts";

describe("resolvePrompt", () => {
  it("returns a single-word positional argument", () => {
    strictEqual(resolvePrompt("hello", [], null), "hello");
  });

  it("joins positional with remaining args for multi-word prompts", () => {
    strictEqual(resolvePrompt("explain", ["monads", "simply"], null), "explain monads simply");
  });

  it("uses stdin content when no positional is provided", () => {
    strictEqual(resolvePrompt(undefined, [], "hello from stdin"), "hello from stdin");
  });

  it("trims stdin content", () => {
    strictEqual(resolvePrompt(undefined, [], "  hello  \n"), "hello");
  });

  it("prefers positional arguments over stdin", () => {
    strictEqual(resolvePrompt("positional", [], "stdin content"), "positional");
  });

  it("throws when no prompt source is available", () => {
    throws(() => resolvePrompt(undefined, [], null), /No prompt provided/);
  });

  it("throws for empty string positional with null stdin", () => {
    throws(() => resolvePrompt("", [], null), /No prompt provided/);
  });

  it("throws for whitespace-only stdin with no positional", () => {
    throws(() => resolvePrompt(undefined, [], "   "), /No prompt provided/);
  });

  it("handles rest args without a positional", () => {
    strictEqual(resolvePrompt(undefined, ["world"], null), "world");
  });
});
