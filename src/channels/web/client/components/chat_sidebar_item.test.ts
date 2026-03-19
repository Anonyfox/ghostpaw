import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { createElement, render } from "preact";
import type { ChatSessionSummary } from "../../shared/chat_session_summary.ts";
import { createTestDOM } from "../create_test_dom.ts";
import { ChatSidebarItem } from "./chat_sidebar_item.tsx";

const sampleSession: ChatSessionSummary = {
  sessionId: 42,
  displayName: "Test Chat",
  model: "claude-sonnet-4-6",
  totalTokens: 100,
  lastActiveAt: Date.now() - 60_000,
  channel: "web",
};

describe("ChatSidebarItem", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("exports a function component", () => {
    assert.equal(typeof ChatSidebarItem, "function");
  });

  it("renders the session display name", () => {
    render(
      createElement(ChatSidebarItem, {
        session: sampleSession,
        active: false,
        onSelect: () => {},
        onRenamed: () => {},
      }),
      dom.container,
    );
    assert.ok(dom.container.textContent!.includes("Test Chat"));
  });

  it("renders the channel badge", () => {
    render(
      createElement(ChatSidebarItem, {
        session: sampleSession,
        active: false,
        onSelect: () => {},
        onRenamed: () => {},
      }),
      dom.container,
    );
    assert.ok(dom.container.textContent!.includes("web"));
  });

  it("renders relative time", () => {
    render(
      createElement(ChatSidebarItem, {
        session: sampleSession,
        active: false,
        onSelect: () => {},
        onRenamed: () => {},
      }),
      dom.container,
    );
    assert.ok(dom.container.textContent!.includes("1m ago"));
  });

  it("calls onSelect with session ID when clicked", () => {
    const onSelect = mock.fn();
    render(
      createElement(ChatSidebarItem, {
        session: sampleSession,
        active: false,
        onSelect,
        onRenamed: () => {},
      }),
      dom.container,
    );
    const btn = dom.container.querySelector("button");
    assert.ok(btn);
    btn!.click();
    assert.equal(onSelect.mock.callCount(), 1);
    assert.equal(onSelect.mock.calls[0].arguments[0], 42);
  });

  it("applies active styling when active", () => {
    render(
      createElement(ChatSidebarItem, {
        session: sampleSession,
        active: true,
        onSelect: () => {},
        onRenamed: () => {},
      }),
      dom.container,
    );
    const btn = dom.container.querySelector("button.fw-semibold");
    assert.ok(btn);
  });
});
