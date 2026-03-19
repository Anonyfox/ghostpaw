import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { ChatInput } from "./chat_input.tsx";

describe("ChatInput", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders a textarea and send button", () => {
    render(<ChatInput onSend={() => {}} defaultModel="test-model" />, dom.container);
    const textarea = dom.container.querySelector("textarea");
    assert.ok(textarea);
    const sendBtn = dom.container.querySelector("button.btn-primary");
    assert.ok(sendBtn);
    assert.ok(sendBtn!.textContent!.includes("Send"));
  });

  it("disables textarea and send button when disabled", () => {
    render(<ChatInput onSend={() => {}} disabled defaultModel="test-model" />, dom.container);
    const textarea = dom.container.querySelector("textarea") as HTMLTextAreaElement;
    assert.ok(textarea.disabled);
    const sendBtn = dom.container.querySelector("button.btn-primary") as HTMLButtonElement;
    assert.ok(sendBtn.disabled);
  });

  it("shows placeholder text when not disabled", () => {
    render(<ChatInput onSend={() => {}} defaultModel="test-model" />, dom.container);
    const textarea = dom.container.querySelector("textarea") as HTMLTextAreaElement;
    assert.equal(textarea.placeholder, "Type a message...");
  });

  it("shows waiting placeholder when disabled", () => {
    render(<ChatInput onSend={() => {}} disabled defaultModel="test-model" />, dom.container);
    const textarea = dom.container.querySelector("textarea") as HTMLTextAreaElement;
    assert.equal(textarea.placeholder, "Waiting for response...");
  });
});
