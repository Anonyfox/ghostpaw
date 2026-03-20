import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { renderTelegramHtml } from "./render_telegram.ts";

describe("renderTelegramHtml", () => {
  it("returns empty string for empty input", () => {
    strictEqual(renderTelegramHtml(""), "");
  });

  it("passes plain text through with HTML escaping", () => {
    strictEqual(renderTelegramHtml("hello world"), "hello world");
  });

  it("escapes HTML entities in plain text", () => {
    const result = renderTelegramHtml("a < b > c & d");
    strictEqual(result, "a &lt; b &gt; c &amp; d");
  });

  it("renders bold", () => {
    strictEqual(renderTelegramHtml("**bold**"), "<b>bold</b>");
  });

  it("renders italic", () => {
    strictEqual(renderTelegramHtml("*italic*"), "<i>italic</i>");
  });

  it("renders inline code", () => {
    strictEqual(renderTelegramHtml("`code`"), "<code>code</code>");
  });

  it("renders strikethrough", () => {
    strictEqual(renderTelegramHtml("~~strike~~"), "<s>strike</s>");
  });

  it("renders links", () => {
    strictEqual(
      renderTelegramHtml("[click](https://example.com)"),
      '<a href="https://example.com">click</a>',
    );
  });

  it("escapes HTML in link URLs", () => {
    strictEqual(
      renderTelegramHtml("[go](https://x.com/a&b)"),
      '<a href="https://x.com/a&amp;b">go</a>',
    );
  });

  it("renders nested bold + italic", () => {
    strictEqual(renderTelegramHtml("**bold *italic***"), "<b>bold <i>italic</i></b>");
  });

  it("renders headings as bold", () => {
    strictEqual(renderTelegramHtml("# Heading"), "<b>Heading</b>");
  });

  it("renders h2 as bold", () => {
    strictEqual(renderTelegramHtml("## Sub"), "<b>Sub</b>");
  });

  it("renders code blocks without language", () => {
    strictEqual(renderTelegramHtml("```\nfoo\nbar\n```"), "<pre>foo\nbar</pre>");
  });

  it("renders code blocks with language", () => {
    strictEqual(
      renderTelegramHtml("```js\nconst x = 1;\n```"),
      '<pre><code class="js">const x = 1;</code></pre>',
    );
  });

  it("escapes HTML inside code blocks", () => {
    strictEqual(
      renderTelegramHtml("```\n<script>alert(1)</script>\n```"),
      "<pre>&lt;script&gt;alert(1)&lt;/script&gt;</pre>",
    );
  });

  it("renders blockquotes", () => {
    strictEqual(renderTelegramHtml("> quoted text"), "<blockquote>quoted text</blockquote>");
  });

  it("renders unordered lists", () => {
    const result = renderTelegramHtml("- one\n- two\n- three");
    strictEqual(result, "• one\n• two\n• three");
  });

  it("renders ordered lists", () => {
    const result = renderTelegramHtml("1. first\n2. second");
    strictEqual(result, "1. first\n2. second");
  });

  it("renders horizontal rules", () => {
    const result = renderTelegramHtml("above\n\n---\n\nbelow");
    strictEqual(result.includes("---"), true);
  });

  describe("tables", () => {
    it("renders narrow table as monospace pre", () => {
      const md = "| A | B |\n|---|---|\n| 1 | 2 |";
      const result = renderTelegramHtml(md);
      strictEqual(result.startsWith("<pre>"), true);
      strictEqual(result.includes("A | B"), true);
      strictEqual(result.includes("1 | 2"), true);
    });

    it("renders wide 2-column table as key-value pairs", () => {
      const md =
        "| Feature | Description |\n|---|---|\n| Authentication | OAuth2 with JWT tokens and refresh |\n| Authorization | Role-based access control system |";
      const result = renderTelegramHtml(md);
      strictEqual(result.includes("<b>Authentication</b>:"), true);
      strictEqual(result.includes("<b>Authorization</b>:"), true);
      strictEqual(result.includes("<pre>"), false);
    });

    it("renders wide 3+ column table as vertical cards", () => {
      const md =
        "| Member | Kind | Status | Trust | Tags |\n|---|---|---|---|---|\n| Max Stroh | human | active | 0.85 | client, engineer |\n| Mandy | human | active | 0.5 | family, wife |";
      const result = renderTelegramHtml(md);
      strictEqual(result.includes("▸ <b>Max Stroh</b>"), true);
      strictEqual(result.includes("Kind: human"), true);
      strictEqual(result.includes("▸ <b>Mandy</b>"), true);
      strictEqual(result.includes("<pre>"), false);
    });

    it("escapes HTML entities in table cells", () => {
      const md = "| Key | Value |\n|---|---|\n| a<b | c&d |";
      const result = renderTelegramHtml(md);
      strictEqual(result.includes("&lt;"), true);
      strictEqual(result.includes("&amp;"), true);
    });

    it("handles single-row tables", () => {
      const md = "| X | Y |\n|---|---|\n| 1 | 2 |";
      const result = renderTelegramHtml(md);
      strictEqual(result.length > 0, true);
    });
  });

  it("handles mixed content", () => {
    const md = "# Title\n\nSome **bold** text.\n\n- item one\n- item two";
    const result = renderTelegramHtml(md);
    strictEqual(result.includes("<b>Title</b>"), true);
    strictEqual(result.includes("<b>bold</b>"), true);
    strictEqual(result.includes("• item one"), true);
  });

  it("renders image as link", () => {
    const result = renderTelegramHtml("![alt text](https://img.png)");
    strictEqual(result.includes('<a href="https://img.png">alt text</a>'), true);
  });
});
