import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { render } from "preact";
import type { LevelInfo } from "../../shared/soul_types.ts";
import { createTestDOM } from "../create_test_dom.ts";
import { MentorLevelUpResult } from "./mentor_level_up_result.tsx";

const mockLevel: LevelInfo = {
  id: 1,
  level: 3,
  essenceBefore: "You are a JavaScript engineer focused on clean code.",
  essenceAfter: "You are a JavaScript engineer with deep expertise in robust error handling.",
  traitsConsolidated: [1, 2],
  traitsPromoted: [3],
  traitsCarried: [4, 5, 6],
  traitsMerged: [7],
  createdAt: Date.now(),
};

describe("MentorLevelUpResult", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders new level number in header", () => {
    render(
      <MentorLevelUpResult
        content="Level-up complete."
        succeeded={true}
        cost={{ totalUsd: 0.08 }}
        level={mockLevel}
        newLevel={3}
        onClose={() => {}}
      />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("Level 3"));
  });

  it("shows before and after essence from LevelInfo", () => {
    render(
      <MentorLevelUpResult
        content="Done."
        succeeded={true}
        cost={{ totalUsd: 0 }}
        level={mockLevel}
        newLevel={3}
        onClose={() => {}}
      />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("focused on clean code"));
    assert.ok(dom.container.textContent?.includes("robust error handling"));
  });

  it("shows trait categorization counts", () => {
    render(
      <MentorLevelUpResult
        content="Done."
        succeeded={true}
        cost={{ totalUsd: 0 }}
        level={mockLevel}
        newLevel={3}
        onClose={() => {}}
      />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("Consolidated: 2"));
    assert.ok(dom.container.textContent?.includes("Promoted: 1"));
    assert.ok(dom.container.textContent?.includes("Carried: 3"));
  });

  it("shows mentor narration content", () => {
    render(
      <MentorLevelUpResult
        content="The soul has grown significantly."
        succeeded={true}
        cost={{ totalUsd: 0.05 }}
        level={mockLevel}
        newLevel={3}
        onClose={() => {}}
      />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("grown significantly"));
  });

  it("shows cost badge", () => {
    render(
      <MentorLevelUpResult
        content="Done."
        succeeded={true}
        cost={{ totalUsd: 0.08 }}
        level={mockLevel}
        newLevel={3}
        onClose={() => {}}
      />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("$0.08"));
  });

  it("fires onClose when close button is clicked", () => {
    const fn = mock.fn();
    render(
      <MentorLevelUpResult
        content="Done."
        succeeded={true}
        cost={{ totalUsd: 0 }}
        level={mockLevel}
        newLevel={3}
        onClose={fn}
      />,
      dom.container,
    );
    const btn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Close"),
    );
    btn!.click();
    assert.strictEqual(fn.mock.callCount(), 1);
  });
});
