import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { Router } from "wouter-preact";
import { createTestDOM } from "../create_test_dom.ts";
import { Layout } from "./layout.tsx";

function renderLayout(container: HTMLElement, children: preact.ComponentChildren = "content") {
  render(
    <Router ssrPath="/dashboard">
      <Layout>{children}</Layout>
    </Router>,
    container,
  );
}

describe("Layout", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders children in the main content area", () => {
    renderLayout(dom.container, <p class="test-child">Hello</p>);

    const main = dom.container.querySelector("main");
    assert.ok(main, "main element exists");
    const child = main!.querySelector(".test-child");
    assert.ok(child, "child rendered inside main");
    assert.equal(child!.textContent, "Hello");
  });

  it("contains the sidebar navigation", () => {
    renderLayout(dom.container);

    const nav = dom.container.querySelector("nav");
    assert.ok(nav, "nav element exists");
    assert.ok(nav!.className.includes("bg-dark"), "sidebar has dark background");
  });

  it("contains a Ghostpaw heading", () => {
    renderLayout(dom.container);

    const heading = dom.container.querySelector("h5");
    assert.ok(heading, "heading exists");
    assert.equal(heading!.textContent, "Ghostpaw");
  });

  it("contains a Dashboard link", () => {
    renderLayout(dom.container);

    const links = dom.container.querySelectorAll("a");
    const dashboard = Array.from(links).find((a) => a.textContent?.trim() === "Dashboard");
    assert.ok(dashboard, "Dashboard link exists");
    assert.equal(dashboard!.getAttribute("href"), "/dashboard");
  });

  it("contains a Logout button", () => {
    renderLayout(dom.container);

    const buttons = dom.container.querySelectorAll("button");
    const logout = Array.from(buttons).find((b) => b.textContent?.trim() === "Logout");
    assert.ok(logout, "Logout button exists");
  });
});
