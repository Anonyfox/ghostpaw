import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { RenderMarkdown } from "./render_markdown.tsx";

describe("RenderMarkdown", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders empty string as empty div", () => {
    render(<RenderMarkdown content="" />, dom.container);
    const el = dom.container.querySelector(".rendered-markdown");
    assert.ok(el);
    assert.equal(el!.innerHTML, "");
  });

  it("renders plain text as paragraph", () => {
    render(<RenderMarkdown content="hello world" />, dom.container);
    const p = dom.container.querySelector("p");
    assert.ok(p);
    assert.ok(p!.textContent!.includes("hello world"));
  });

  it("renders bold text", () => {
    render(<RenderMarkdown content="**bold**" />, dom.container);
    const strong = dom.container.querySelector("strong");
    assert.ok(strong);
    assert.equal(strong!.textContent, "bold");
  });

  it("renders code blocks", () => {
    render(<RenderMarkdown content="```js\nconst x = 1;\n```" />, dom.container);
    const code = dom.container.querySelector("code");
    assert.ok(code);
    assert.ok(code!.textContent!.includes("const x = 1;"));
  });
});
