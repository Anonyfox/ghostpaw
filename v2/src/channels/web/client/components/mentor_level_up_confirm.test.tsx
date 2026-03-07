import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { MentorLevelUpConfirm } from "./mentor_level_up_confirm.tsx";

describe("MentorLevelUpConfirm", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders soul name in heading", () => {
    render(
      <MentorLevelUpConfirm soulName="JS Engineer" onConfirm={() => {}} onCancel={() => {}} />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("JS Engineer"));
  });

  it("renders explanation of what level-up does", () => {
    render(
      <MentorLevelUpConfirm soulName="Test" onConfirm={() => {}} onCancel={() => {}} />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("Consolidate"));
    assert.ok(dom.container.textContent?.includes("Promote"));
    assert.ok(dom.container.textContent?.includes("essence"));
  });

  it("fires onConfirm when Level Up Now is clicked", () => {
    const fn = mock.fn();
    render(
      <MentorLevelUpConfirm soulName="Test" onConfirm={fn} onCancel={() => {}} />,
      dom.container,
    );
    const btn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Level Up Now"),
    );
    btn!.click();
    assert.strictEqual(fn.mock.callCount(), 1);
  });

  it("fires onCancel when Cancel is clicked", () => {
    const fn = mock.fn();
    render(
      <MentorLevelUpConfirm soulName="Test" onConfirm={() => {}} onCancel={fn} />,
      dom.container,
    );
    const btn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Cancel"),
    );
    btn!.click();
    assert.strictEqual(fn.mock.callCount(), 1);
  });

  it("shows irreversibility warning", () => {
    render(
      <MentorLevelUpConfirm soulName="Test" onConfirm={() => {}} onCancel={() => {}} />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("cannot be undone"));
  });
});
