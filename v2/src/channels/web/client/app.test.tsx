import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { Router } from "wouter-preact";
import { App } from "./app.tsx";
import { createTestDOM } from "./create_test_dom.ts";

describe("App", () => {
  let dom: ReturnType<typeof createTestDOM>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
    globalThis.fetch = originalFetch;
  });

  it("renders the login page at /login", () => {
    render(
      <Router ssrPath="/login">
        <App />
      </Router>,
      dom.container,
    );
    const heading = dom.container.querySelector("h4");
    assert.ok(heading);
    assert.equal(heading!.textContent, "Ghostpaw");
    assert.ok(dom.container.querySelector('input[type="password"]'));
  });

  it("renders the layout with sidebar for non-login routes", () => {
    render(
      <Router ssrPath="/dashboard">
        <App />
      </Router>,
      dom.container,
    );
    assert.ok(dom.container.querySelector("nav"));
    assert.ok(dom.container.querySelector("main"));
  });

  it("renders the dashboard page at /dashboard", () => {
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    globalThis.fetch = (async () => ({ ok: true, json: async () => ({}) })) as any;
    render(
      <Router ssrPath="/dashboard">
        <App />
      </Router>,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("Dashboard"));
  });

  it("renders the settings page at /settings", () => {
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    globalThis.fetch = (async () => ({ ok: true, json: async () => ({ secrets: [] }) })) as any;
    render(
      <Router ssrPath="/settings">
        <App />
      </Router>,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("Settings"));
  });

  it("shows not found for unknown routes", () => {
    render(
      <Router ssrPath="/nonexistent">
        <App />
      </Router>,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("Page not found."));
  });
});
