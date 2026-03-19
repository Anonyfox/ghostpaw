import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { PackInteractionTimeline } from "./pack_interaction_timeline.tsx";

describe("PackInteractionTimeline", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders empty state message", () => {
    render(<PackInteractionTimeline interactions={[]} />, dom.container);
    assert.ok(dom.container.textContent?.includes("No interactions recorded"));
  });

  it("renders interactions", () => {
    const interactions = [
      {
        id: 1,
        kind: "conversation",
        summary: "Talked plans",
        significance: 0.5,
        occurredAt: null,
        createdAt: Date.now(),
      },
      {
        id: 2,
        kind: "gift",
        summary: "Shared resource",
        significance: 0.8,
        occurredAt: null,
        createdAt: Date.now(),
      },
    ];
    render(<PackInteractionTimeline interactions={interactions} />, dom.container);
    assert.ok(dom.container.textContent?.includes("Talked plans"));
    assert.ok(dom.container.textContent?.includes("Shared resource"));
  });
});
