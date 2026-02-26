import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../test_dom.ts";
import { LoginPage } from "./login.tsx";

describe("LoginPage", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders a password input and submit button", () => {
    render(<LoginPage />, dom.container);

    const input = dom.container.querySelector("input[type='password']");
    assert.ok(input, "password input exists");

    const button = dom.container.querySelector("button[type='submit']");
    assert.ok(button, "submit button exists");
  });

  it("contains Ghostpaw heading", () => {
    render(<LoginPage />, dom.container);

    const heading = dom.container.querySelector("h4");
    assert.ok(heading, "heading exists");
    assert.equal(heading!.textContent, "Ghostpaw");
  });

  it("contains Sign in button text", () => {
    render(<LoginPage />, dom.container);

    const button = dom.container.querySelector("button[type='submit']");
    assert.ok(button);
    assert.equal(button!.textContent, "Sign in");
  });

  it("shows the password input as type=password", () => {
    render(<LoginPage />, dom.container);

    const input = dom.container.querySelector("input");
    assert.ok(input);
    assert.equal(input!.getAttribute("type"), "password");
  });
});
