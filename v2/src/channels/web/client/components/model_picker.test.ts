import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { createElement, render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { ModelPicker } from "./model_picker.tsx";

describe("ModelPicker", () => {
  let dom: ReturnType<typeof createTestDOM>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    dom = createTestDOM();
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ providers: [], currentModel: "test", currentProvider: null }),
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
    globalThis.fetch = originalFetch;
  });

  it("exports a function component", () => {
    assert.equal(typeof ModelPicker, "function");
  });

  it("renders a dropdown toggle button", () => {
    render(
      createElement(ModelPicker, {
        value: "claude-sonnet-4-6",
        onChange: () => {},
      }),
      dom.container,
    );
    const btn = dom.container.querySelector("button.dropdown-toggle");
    assert.ok(btn);
  });

  it("shows shortened model name on button", () => {
    render(
      createElement(ModelPicker, {
        value: "claude-sonnet-4-6",
        onChange: () => {},
      }),
      dom.container,
    );
    const btn = dom.container.querySelector("button.dropdown-toggle");
    assert.ok(btn);
    assert.ok(btn!.textContent!.includes("4-6"));
  });

  it("does not show dropdown menu when closed", () => {
    render(
      createElement(ModelPicker, {
        value: "claude-sonnet-4-6",
        onChange: () => {},
      }),
      dom.container,
    );
    const menu = dom.container.querySelector(".dropdown-menu");
    assert.equal(menu, null);
  });

  it("disables the button when disabled prop is set", () => {
    render(
      createElement(ModelPicker, {
        value: "gpt-4o",
        onChange: () => {},
        disabled: true,
      }),
      dom.container,
    );
    const btn = dom.container.querySelector("button.dropdown-toggle") as HTMLButtonElement;
    assert.ok(btn);
    assert.equal(btn.disabled, true);
  });
});
