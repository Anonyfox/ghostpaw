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

  it("contains a sticky-top navbar", () => {
    renderLayout(dom.container);

    const nav = dom.container.querySelector("nav");
    assert.ok(nav, "nav element exists");
    assert.ok(nav!.className.includes("navbar"), "nav has navbar class");
    assert.ok(nav!.className.includes("bg-body-secondary"), "navbar has secondary background");
    assert.ok(nav!.className.includes("sticky-top"), "navbar is sticky-top");
  });

  it("contains a Ghostpaw brand link to dashboard", () => {
    renderLayout(dom.container);

    const brand = dom.container.querySelector(".navbar-brand");
    assert.ok(brand, "brand link exists");
    assert.equal(brand!.textContent, "Ghostpaw");
    assert.equal(brand!.getAttribute("href"), "/dashboard");
  });

  it("contains nav links for all pages", () => {
    renderLayout(dom.container);

    const links = dom.container.querySelectorAll("a");
    const labels = Array.from(links).map((a) => a.textContent?.trim());
    assert.ok(labels.includes("Souls"), "Souls link exists");
    assert.ok(labels.includes("Skills"), "Skills link exists");
    assert.ok(labels.includes("Chat"), "Chat link exists");
    assert.ok(labels.includes("Settings"), "Settings link exists");
  });

  it("contains a hamburger toggle button", () => {
    renderLayout(dom.container);

    const toggler = dom.container.querySelector(".navbar-toggler");
    assert.ok(toggler, "navbar toggler exists");
  });

  it("contains a Logout button", () => {
    renderLayout(dom.container);

    const buttons = dom.container.querySelectorAll("button");
    const logout = Array.from(buttons).find((b) => b.textContent?.trim() === "Logout");
    assert.ok(logout, "Logout button exists");
  });
});
