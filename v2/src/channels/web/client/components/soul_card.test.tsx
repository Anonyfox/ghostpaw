import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import type { SoulOverviewInfo } from "../../shared/soul_types.ts";
import { createTestDOM } from "../create_test_dom.ts";
import { SoulCard } from "./soul_card.tsx";

const mockSoul: SoulOverviewInfo = {
  id: 5,
  name: "Custom Soul",
  description: "A custom soul for testing.",
  level: 2,
  activeTraitCount: 3,
  essencePreview: "A custom soul essence.",
  isMandatory: false,
  updatedAt: Date.now(),
};

const mandatorySoul: SoulOverviewInfo = {
  ...mockSoul,
  id: 1,
  name: "Ghostpaw",
  isMandatory: true,
};

describe("SoulCard", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders soul name and level", () => {
    render(<SoulCard soul={mockSoul} traitLimit={10} />, dom.container);
    assert.ok(dom.container.textContent?.includes("Custom Soul"));
    assert.ok(dom.container.textContent?.includes("Lv. 2"));
  });

  it("renders description", () => {
    render(<SoulCard soul={mockSoul} traitLimit={10} />, dom.container);
    assert.ok(dom.container.textContent?.includes("A custom soul for testing."));
  });

  it("renders XP bar with trait fraction", () => {
    render(<SoulCard soul={mockSoul} traitLimit={10} />, dom.container);
    assert.ok(dom.container.querySelector(".progress-bar"));
    assert.ok(dom.container.textContent?.includes("3/10"));
  });

  it("shows archive button for non-mandatory souls", () => {
    render(<SoulCard soul={mockSoul} traitLimit={10} onArchive={() => {}} />, dom.container);
    const btn = dom.container.querySelector(".btn-outline-danger");
    assert.ok(btn);
    assert.ok(btn!.textContent?.includes("Archive"));
  });

  it("hides archive button for mandatory souls", () => {
    render(<SoulCard soul={mandatorySoul} traitLimit={10} onArchive={() => {}} />, dom.container);
    assert.equal(dom.container.querySelector(".btn-outline-danger"), null);
    assert.ok(dom.container.querySelector(".badge.bg-warning"));
  });

  it("shows restore button for graveyard variant", () => {
    render(
      <SoulCard soul={mockSoul} traitLimit={10} variant="graveyard" onRestore={() => {}} />,
      dom.container,
    );
    const btn = dom.container.querySelector(".btn-outline-success");
    assert.ok(btn);
    assert.ok(btn!.textContent?.includes("Restore"));
  });

  it("applies hero styling", () => {
    render(<SoulCard soul={mandatorySoul} traitLimit={10} variant="hero" />, dom.container);
    const card = dom.container.querySelector(".card");
    assert.ok(card?.className.includes("bg-dark"));
    assert.ok(card?.className.includes("border-info"));
  });
});
