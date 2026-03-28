import assert from "node:assert";
import { describe, it } from "node:test";
import { sanitizeLlmContent } from "./sanitize_llm_content.ts";

describe("sanitizeLlmContent", () => {
  it("decodes HTML entities in non-HTML files", () => {
    const result = sanitizeLlmContent("a &amp; b &lt; c &gt; d", "file.ts");
    assert.strictEqual(result, "a & b < c > d");
  });

  it("preserves HTML entities in .html files", () => {
    const result = sanitizeLlmContent("a &amp; b", "page.html");
    assert.strictEqual(result, "a &amp; b");
  });

  it("unescapes literal \\n sequences", () => {
    const result = sanitizeLlmContent("line1\\nline2", "file.ts");
    assert.strictEqual(result, "line1\nline2");
  });

  it("does not unescape \\n when real newlines exist", () => {
    const input = "line1\nline2\\n";
    const result = sanitizeLlmContent(input, "file.ts");
    assert.strictEqual(result, input);
  });

  it("returns short content unchanged", () => {
    assert.strictEqual(sanitizeLlmContent("a", "f.ts"), "a");
    assert.strictEqual(sanitizeLlmContent("", "f.ts"), "");
  });
});
