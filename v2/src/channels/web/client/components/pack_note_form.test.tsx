import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { PackNoteForm } from "./pack_note_form.tsx";

describe("PackNoteForm", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders form with kind selector and submit button", () => {
    render(<PackNoteForm memberId={1} onNoted={() => {}} />, dom.container);
    assert.ok(dom.container.querySelector("select"), "kind selector should exist");
    assert.ok(dom.container.querySelector("textarea"), "summary textarea should exist");
    assert.ok(dom.container.textContent?.includes("Record"));
  });

  it("renders significance slider", () => {
    render(<PackNoteForm memberId={1} onNoted={() => {}} />, dom.container);
    const range = dom.container.querySelector('input[type="range"]');
    assert.ok(range, "significance range slider should exist");
  });
});
