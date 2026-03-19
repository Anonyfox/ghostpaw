import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import type { ChatMessageInfo } from "../../shared/chat_message_info.ts";
import { createTestDOM } from "../create_test_dom.ts";
import { MessageBubble } from "./message_bubble.tsx";

describe("MessageBubble", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  const userMsg: ChatMessageInfo = {
    id: 1,
    role: "user",
    content: "Hello",
    createdAt: Date.now(),
    replyToId: null,
  };

  const assistantMsg: ChatMessageInfo = {
    id: 2,
    role: "assistant",
    content: "Hi there!",
    createdAt: Date.now(),
    replyToId: null,
  };

  it("renders user message right-aligned with primary bg", () => {
    render(<MessageBubble message={userMsg} />, dom.container);
    const outer = dom.container.querySelector(".justify-content-end");
    assert.ok(outer);
    const card = dom.container.querySelector(".bg-primary");
    assert.ok(card);
    assert.ok(dom.container.textContent!.includes("Hello"));
  });

  it("renders assistant message left-aligned with secondary bg", () => {
    render(<MessageBubble message={assistantMsg} />, dom.container);
    const outer = dom.container.querySelector(".justify-content-start");
    assert.ok(outer);
    const card = dom.container.querySelector(".bg-body-secondary");
    assert.ok(card);
    assert.ok(dom.container.textContent!.includes("Hi there!"));
  });

  it("shows streaming indicator when streaming", () => {
    render(<MessageBubble message={assistantMsg} streaming />, dom.container);
    const indicator = dom.container.querySelector(".streaming-indicator");
    assert.ok(indicator);
  });

  it("hides streaming indicator by default", () => {
    render(<MessageBubble message={assistantMsg} />, dom.container);
    const indicator = dom.container.querySelector(".streaming-indicator");
    assert.equal(indicator, null);
  });
});
