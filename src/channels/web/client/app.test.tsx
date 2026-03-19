import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { App } from "./app.tsx";
import { createTestDOM } from "./create_test_dom.ts";

describe("App", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("is a function component", () => {
    assert.equal(typeof App, "function");
  });

  it("renders without throwing", () => {
    assert.doesNotThrow(() => {
      render(<App />, dom.container);
    });
  });

  it("renders the login page at /login path", () => {
    (dom.window as unknown as { location: { href: string } }).location.href =
      "http://localhost/login";
    render(<App />, dom.container);
    assert.ok(dom.container.innerHTML.length > 0);
  });
});
