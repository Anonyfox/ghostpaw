import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { MentorRefineInput } from "./mentor_refine_input.tsx";

describe("MentorRefineInput", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders textarea with placeholder", () => {
    render(<MentorRefineInput onSubmit={() => {}} onCancel={() => {}} />, dom.container);
    const textarea = dom.container.querySelector("textarea") as HTMLTextAreaElement;
    assert.ok(textarea);
    assert.ok(textarea.placeholder.includes("learn or improve"));
  });

  it("does not fire onSubmit when textarea is empty", () => {
    const fn = mock.fn();
    render(<MentorRefineInput onSubmit={fn} onCancel={() => {}} />, dom.container);
    const submitBtn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Submit"),
    );
    submitBtn!.click();
    assert.strictEqual(fn.mock.callCount(), 0);
  });

  it("fires onSubmit with trimmed text when textarea has content", () => {
    const fn = mock.fn();
    render(<MentorRefineInput onSubmit={fn} onCancel={() => {}} />, dom.container);
    const textarea = dom.container.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "  improve error handling  ";
    const submitBtn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Submit"),
    );
    submitBtn!.click();
    assert.strictEqual(fn.mock.callCount(), 1);
    assert.strictEqual(fn.mock.calls[0].arguments[0], "improve error handling");
  });

  it("fires onCancel when cancel is clicked", () => {
    const fn = mock.fn();
    render(<MentorRefineInput onSubmit={() => {}} onCancel={fn} />, dom.container);
    const cancelBtn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Cancel"),
    );
    cancelBtn!.click();
    assert.strictEqual(fn.mock.callCount(), 1);
  });

  it("disables both buttons when disabled prop is true", () => {
    render(<MentorRefineInput onSubmit={() => {}} onCancel={() => {}} disabled />, dom.container);
    const buttons = dom.container.querySelectorAll("button");
    for (const btn of buttons) {
      assert.ok((btn as HTMLButtonElement).disabled);
    }
  });

  it("does not fire onSubmit when disabled even with content", () => {
    const fn = mock.fn();
    render(<MentorRefineInput onSubmit={fn} onCancel={() => {}} disabled />, dom.container);
    const textarea = dom.container.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "some feedback";
    const submitBtn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Submit"),
    );
    submitBtn!.click();
    assert.strictEqual(fn.mock.callCount(), 0);
  });
});
