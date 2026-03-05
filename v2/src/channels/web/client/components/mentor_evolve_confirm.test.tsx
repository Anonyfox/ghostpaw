import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { MentorEvolveConfirm } from "./mentor_evolve_confirm.tsx";

describe("MentorEvolveConfirm", () => {
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
      <MentorEvolveConfirm soulName="JS Engineer" onConfirm={() => {}} onCancel={() => {}} />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("JS Engineer"));
  });

  it("renders explanation of what evolution does", () => {
    render(
      <MentorEvolveConfirm soulName="Test" onConfirm={() => {}} onCancel={() => {}} />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("Consolidate"));
    assert.ok(dom.container.textContent?.includes("Promote"));
    assert.ok(dom.container.textContent?.includes("essence"));
  });

  it("fires onConfirm when Evolve Now is clicked", () => {
    const fn = mock.fn();
    render(
      <MentorEvolveConfirm soulName="Test" onConfirm={fn} onCancel={() => {}} />,
      dom.container,
    );
    const btn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Evolve Now"),
    );
    btn!.click();
    assert.strictEqual(fn.mock.callCount(), 1);
  });

  it("fires onCancel when Cancel is clicked", () => {
    const fn = mock.fn();
    render(
      <MentorEvolveConfirm soulName="Test" onConfirm={() => {}} onCancel={fn} />,
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
      <MentorEvolveConfirm soulName="Test" onConfirm={() => {}} onCancel={() => {}} />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("cannot be undone"));
  });
});
