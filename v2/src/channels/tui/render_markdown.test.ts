import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { renderMarkdown } from "./render_markdown.ts";
import { stripAnsi } from "./wrap_text.ts";

describe("renderMarkdown", () => {
  it("renders plain text as-is with trailing newline", () => {
    const result = renderMarkdown("hello world");
    strictEqual(stripAnsi(result).trim(), "hello world");
  });

  it("renders bold text preserving the word", () => {
    const result = renderMarkdown("**bold**");
    ok(stripAnsi(result).includes("bold"));
  });

  it("renders italic text preserving the word", () => {
    const result = renderMarkdown("*italic*");
    ok(stripAnsi(result).includes("italic"));
  });

  it("renders inline code preserving the text", () => {
    const result = renderMarkdown("use `foo()` here");
    ok(stripAnsi(result).includes("foo()"));
  });

  it("renders code blocks with language label", () => {
    const result = renderMarkdown("```js\nconst x = 1;\n```");
    const plain = stripAnsi(result);
    ok(plain.includes("[js]"));
    ok(plain.includes("const x = 1;"));
  });

  it("renders code blocks without language", () => {
    const result = renderMarkdown("```\nhello\n```");
    ok(stripAnsi(result).includes("hello"));
  });

  it("renders unordered lists with bullet markers", () => {
    const result = renderMarkdown("- first\n- second");
    const plain = stripAnsi(result);
    ok(plain.includes("- first"));
    ok(plain.includes("- second"));
  });

  it("renders headings preserving the text", () => {
    const result = renderMarkdown("## Section");
    ok(stripAnsi(result).includes("Section"));
  });

  it("renders blockquotes with pipe prefix", () => {
    const result = renderMarkdown("> quoted text");
    ok(stripAnsi(result).includes("|"));
    ok(stripAnsi(result).includes("quoted text"));
  });

  it("handles mixed inline formatting", () => {
    const result = renderMarkdown("**bold** and `code` and *italic*");
    const plain = stripAnsi(result);
    ok(plain.includes("bold"));
    ok(plain.includes("code"));
    ok(plain.includes("italic"));
  });

  it("handles empty input", () => {
    const result = renderMarkdown("");
    strictEqual(result, "");
  });
});
