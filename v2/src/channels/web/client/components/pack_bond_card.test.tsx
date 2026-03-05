import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import type { PackMemberInfo } from "../../shared/pack_types.ts";
import { createTestDOM } from "../create_test_dom.ts";
import { PackBondCard } from "./pack_bond_card.tsx";

const activeMember: PackMemberInfo = {
  id: 1,
  name: "Alice",
  kind: "human",
  trust: 0.7,
  trustLevel: "solid",
  status: "active",
  bondExcerpt: "Trusted friend and collaborator.",
  lastContact: Date.now() - 60_000,
  interactionCount: 5,
};

describe("PackBondCard", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders member name", () => {
    render(<PackBondCard member={activeMember} />, dom.container);
    assert.ok(dom.container.textContent?.includes("Alice"));
  });

  it("renders kind badge", () => {
    render(<PackBondCard member={activeMember} />, dom.container);
    assert.ok(dom.container.textContent?.includes("human"));
  });

  it("renders trust pips", () => {
    render(<PackBondCard member={activeMember} />, dom.container);
    const pips = dom.container.querySelectorAll(".rounded-circle");
    assert.equal(pips.length, 10);
  });

  it("renders bond excerpt", () => {
    render(<PackBondCard member={activeMember} />, dom.container);
    assert.ok(dom.container.textContent?.includes("Trusted friend"));
  });

  it("applies dormant styling", () => {
    const dormant = { ...activeMember, status: "dormant" };
    render(<PackBondCard member={dormant} />, dom.container);
    const card = dom.container.querySelector(".card");
    assert.ok(card?.className.includes("opacity-75"));
  });

  it("applies lost styling", () => {
    const lost = { ...activeMember, status: "lost" };
    render(<PackBondCard member={lost} />, dom.container);
    const card = dom.container.querySelector(".card");
    assert.ok(card?.className.includes("opacity-50"));
  });
});
