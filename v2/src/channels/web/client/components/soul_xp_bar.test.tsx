import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { SoulXpBar } from "./soul_xp_bar.tsx";

describe("SoulXpBar", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders a progress bar with correct width percentage", () => {
    render(<SoulXpBar activeTraits={6} traitLimit={10} />, dom.container);
    const bar = dom.container.querySelector(".progress-bar") as HTMLElement;
    assert.ok(bar);
    assert.equal(bar.style.width, "60%");
  });

  it("shows fraction label", () => {
    render(<SoulXpBar activeTraits={3} traitLimit={10} />, dom.container);
    assert.ok(dom.container.textContent?.includes("3/10"));
  });

  it("shows Ready! when activeTraits equals traitLimit", () => {
    render(<SoulXpBar activeTraits={10} traitLimit={10} />, dom.container);
    assert.ok(dom.container.textContent?.includes("Ready!"));
    const bar = dom.container.querySelector(".progress-bar");
    assert.ok(bar?.className.includes("bg-warning"));
  });

  it("shows Overflow when activeTraits exceeds traitLimit", () => {
    render(<SoulXpBar activeTraits={12} traitLimit={10} />, dom.container);
    assert.ok(dom.container.textContent?.includes("Overflow"));
    const bar = dom.container.querySelector(".progress-bar");
    assert.ok(bar?.className.includes("bg-danger"));
  });

  it("uses bg-secondary when archived", () => {
    render(<SoulXpBar activeTraits={5} traitLimit={10} isArchived />, dom.container);
    const bar = dom.container.querySelector(".progress-bar");
    assert.ok(bar?.className.includes("bg-secondary"));
  });

  it("renders nothing when traitLimit is 0", () => {
    render(<SoulXpBar activeTraits={5} traitLimit={0} />, dom.container);
    assert.equal(dom.container.querySelector(".progress"), null);
  });

  it("uses compact height by default", () => {
    render(<SoulXpBar activeTraits={5} traitLimit={10} />, dom.container);
    const progress = dom.container.querySelector(".progress") as HTMLElement;
    assert.equal(progress.style.height, "6px");
  });

  it("uses full height when variant is full", () => {
    render(<SoulXpBar activeTraits={5} traitLimit={10} variant="full" />, dom.container);
    const progress = dom.container.querySelector(".progress") as HTMLElement;
    assert.equal(progress.style.height, "12px");
  });

  it("clamps percent to 100 for overflow", () => {
    render(<SoulXpBar activeTraits={15} traitLimit={10} />, dom.container);
    const bar = dom.container.querySelector(".progress-bar") as HTMLElement;
    assert.equal(bar.style.width, "100%");
  });

  it("handles zero active traits", () => {
    render(<SoulXpBar activeTraits={0} traitLimit={10} />, dom.container);
    const bar = dom.container.querySelector(".progress-bar") as HTMLElement;
    assert.equal(bar.style.width, "0%");
    assert.ok(dom.container.textContent?.includes("0/10"));
  });
});
