import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import type { ChatMessageInfo } from "../../shared/chat_message_info.ts";
import { createTestDOM } from "../create_test_dom.ts";
import { MessageList } from "./message_list.tsx";

describe("MessageList", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("shows empty state when no messages", () => {
    render(<MessageList messages={[]} streamingContent="" />, dom.container);
    assert.ok(dom.container.textContent!.includes("Start a conversation"));
  });

  it("renders messages", () => {
    const msgs: ChatMessageInfo[] = [
      { id: 1, role: "user", content: "Hello", createdAt: Date.now(), replyToId: null },
      { id: 2, role: "assistant", content: "Hi!", createdAt: Date.now(), replyToId: null },
    ];
    render(<MessageList messages={msgs} streamingContent="" />, dom.container);
    assert.ok(dom.container.textContent!.includes("Hello"));
    assert.ok(dom.container.textContent!.includes("Hi!"));
  });

  it("shows streaming content as an additional bubble", () => {
    const msgs: ChatMessageInfo[] = [
      { id: 1, role: "user", content: "Tell me", createdAt: Date.now(), replyToId: null },
    ];
    render(<MessageList messages={msgs} streamingContent="Working on it..." />, dom.container);
    assert.ok(dom.container.textContent!.includes("Working on it..."));
    const indicators = dom.container.querySelectorAll(".streaming-indicator");
    assert.equal(indicators.length, 1);
  });

  it("hides empty state during streaming", () => {
    render(<MessageList messages={[]} streamingContent="Thinking..." />, dom.container);
    assert.ok(!dom.container.textContent!.includes("Start a conversation"));
  });

  it("shows thinking indicator when waiting", () => {
    const msgs: ChatMessageInfo[] = [
      { id: 1, role: "user", content: "Hello", createdAt: Date.now(), replyToId: null },
    ];
    render(<MessageList messages={msgs} streamingContent="" waiting />, dom.container);
    const spinners = dom.container.querySelectorAll(".spinner-grow");
    assert.ok(spinners.length >= 3);
  });

  it("hides thinking indicator once streaming starts", () => {
    const msgs: ChatMessageInfo[] = [
      { id: 1, role: "user", content: "Hello", createdAt: Date.now(), replyToId: null },
    ];
    render(<MessageList messages={msgs} streamingContent="Hi" waiting />, dom.container);
    const indicators = dom.container.querySelectorAll(".streaming-indicator");
    assert.equal(indicators.length, 1);
  });

  it("hides empty state when waiting", () => {
    render(<MessageList messages={[]} streamingContent="" waiting />, dom.container);
    assert.ok(!dom.container.textContent!.includes("Start a conversation"));
  });
});
