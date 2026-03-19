import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { detectModality, extractCommentText } from "./detect_modality.ts";

describe("detectModality", () => {
  it("returns code when compression < 0.35", () => {
    strictEqual(detectModality("anything", 0.3), "code");
  });

  it("returns code when syntax density exceeds 50%", () => {
    const code = ["function foo() {", "  const x = 1;", "  return x;", "}"].join("\n");
    strictEqual(detectModality(code, 0.5), "code");
  });

  it("returns dialogue when speaker labels exceed 30%", () => {
    const dialogue = [
      "Alice: Hello there.",
      "Bob: How are you?",
      "Alice: Fine, thanks.",
      "Bob: Great to hear.",
      "The conversation ended.",
    ].join("\n");
    strictEqual(detectModality(dialogue, 0.5), "dialogue");
  });

  it("returns prose for normal text", () => {
    const text = [
      "The sun rose over the mountains.",
      "Birds began to sing their morning songs.",
      "A gentle breeze carried the scent of flowers.",
      "The day promised warmth and clear skies ahead.",
    ].join("\n");
    strictEqual(detectModality(text, 0.45), "prose");
  });

  it("returns prose when too few lines for dialogue detection", () => {
    strictEqual(detectModality("Alice: Hello.\nBob: Hi.", 0.5), "prose");
  });
});

describe("extractCommentText", () => {
  it("extracts single-line comment text", () => {
    const code = "// this is a comment\nconst x = 1;\n// another comment";
    const result = extractCommentText(code);
    strictEqual(result, "this is a comment. another comment");
  });

  it("extracts hash comments", () => {
    const code = "# Python comment\nx = 1\n# Another";
    const result = extractCommentText(code);
    strictEqual(result, "Python comment. Another");
  });

  it("returns empty string when no comments", () => {
    strictEqual(extractCommentText("const x = 1;\nconst y = 2;"), "");
  });
});
