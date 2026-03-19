import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeLlmContent } from "./sanitize_llm_content.ts";

describe("sanitizeLlmContent", () => {
  it("unescapes common HTML entities in non-HTML files", () => {
    strictEqual(sanitizeLlmContent("a &amp;&amp; b", "x.js"), "a && b");
    strictEqual(sanitizeLlmContent("x &lt; y", "x.js"), "x < y");
    strictEqual(sanitizeLlmContent("x &gt; y", "x.js"), "x > y");
    strictEqual(sanitizeLlmContent("&quot;hi&quot;", "x.js"), '"hi"');
  });

  it("skips HTML entity unescaping for .html files", () => {
    strictEqual(sanitizeLlmContent("a &amp; b", "page.html"), "a &amp; b");
    strictEqual(sanitizeLlmContent("a &amp; b", "page.HTML"), "a &amp; b");
  });

  it("converts literal \\n to newlines when no real newlines exist", () => {
    strictEqual(sanitizeLlmContent("a\\nb\\nc", "x.js"), "a\nb\nc");
  });

  it("preserves content with real newlines", () => {
    strictEqual(sanitizeLlmContent("a\nb\nc", "x.js"), "a\nb\nc");
  });

  it("handles empty and short content unchanged", () => {
    strictEqual(sanitizeLlmContent("", "x.js"), "");
    strictEqual(sanitizeLlmContent("a", "x.js"), "a");
  });

  it("fixes both HTML entities and literal newlines together", () => {
    strictEqual(
      sanitizeLlmContent(
        "#!/usr/bin/env node\\nimport fs from 'fs';\\nif (a &lt; b &amp;&amp; c &gt; d) {}",
        "audit.mjs",
      ),
      "#!/usr/bin/env node\nimport fs from 'fs';\nif (a < b && c > d) {}",
    );
  });
});
