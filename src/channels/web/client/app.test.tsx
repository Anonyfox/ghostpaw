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

  it("renders the login page at /login path", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: happy-dom fetch shim for test
    (globalThis as any).fetch = async () =>
      new Response(JSON.stringify({ hasLlmKey: true }), {
        headers: { "Content-Type": "application/json" },
      });
    (dom.window as unknown as { location: { href: string } }).location.href =
      "http://localhost/login";
    render(<App />, dom.container);
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(dom.container.innerHTML.length > 0);
  });
});
