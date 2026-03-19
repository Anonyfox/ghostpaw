import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { ChatPage } from "./chat.tsx";

describe("ChatPage", () => {
  let dom: ReturnType<typeof createTestDOM>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    dom = createTestDOM();
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [],
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
    globalThis.fetch = originalFetch;
  });

  it("is a function component", () => {
    assert.equal(typeof ChatPage, "function");
  });

  it("renders without throwing", () => {
    assert.doesNotThrow(() => {
      render(<ChatPage />, dom.container);
    });
  });

  it("shows New Chat header for a fresh session", () => {
    render(<ChatPage />, dom.container);
    assert.ok(dom.container.textContent!.includes("New Chat"));
  });

  it("renders the chat input area", () => {
    render(<ChatPage />, dom.container);
    const textarea = dom.container.querySelector("textarea");
    assert.ok(textarea);
  });

  it("renders the send button", () => {
    render(<ChatPage />, dom.container);
    const btn = dom.container.querySelector("button.btn-primary");
    assert.ok(btn);
  });

  it("renders the new chat button in sidebar", () => {
    render(<ChatPage />, dom.container);
    assert.ok(dom.container.textContent!.includes("+ New Chat"));
  });
});
