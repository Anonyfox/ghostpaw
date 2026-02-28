import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { createElement, render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { ChatSidebar } from "./chat_sidebar.tsx";

describe("ChatSidebar", () => {
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

  it("exports a function component", () => {
    assert.equal(typeof ChatSidebar, "function");
  });

  it("renders the new chat button", () => {
    render(
      createElement(ChatSidebar, {
        activeSessionId: null,
        onSelectSession: () => {},
        onNewChat: () => {},
        updatedTitle: null,
      }),
      dom.container,
    );
    assert.ok(dom.container.textContent!.includes("+ New Chat"));
  });

  it("shows loading state initially", () => {
    render(
      createElement(ChatSidebar, {
        activeSessionId: null,
        onSelectSession: () => {},
        onNewChat: () => {},
        updatedTitle: null,
      }),
      dom.container,
    );
    assert.ok(dom.container.textContent!.includes("Loading"));
  });

  it("calls onNewChat when new chat button is clicked", () => {
    const onNewChat = mock.fn();
    render(
      createElement(ChatSidebar, {
        activeSessionId: null,
        onSelectSession: () => {},
        onNewChat,
        updatedTitle: null,
      }),
      dom.container,
    );
    const btn = dom.container.querySelector("button.btn-primary") as HTMLButtonElement;
    assert.ok(btn);
    btn.click();
    assert.equal(onNewChat.mock.callCount(), 1);
  });
});
