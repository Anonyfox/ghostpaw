import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { useRef } from "preact/hooks";
import { createTestDOM } from "../create_test_dom.ts";
import { InlineEditForm } from "./inline_edit_form.tsx";

describe("InlineEditForm", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders input, Save, and Cancel buttons", () => {
    function Wrapper() {
      const ref = useRef<HTMLInputElement>(null);
      return (
        <InlineEditForm
          inputRef={ref}
          type="text"
          placeholder="test"
          submitting={false}
          onSave={() => {}}
          onCancel={() => {}}
        />
      );
    }
    render(<Wrapper />, dom.container);
    const input = dom.container.querySelector("input");
    assert.ok(input);
    const buttons = dom.container.querySelectorAll("button");
    assert.equal(buttons.length, 2);
  });
});
