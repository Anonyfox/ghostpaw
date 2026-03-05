import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { PackKindBadge } from "./pack_kind_badge.tsx";

describe("PackKindBadge", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders badge with kind text", () => {
    render(<PackKindBadge kind="human" />, dom.container);
    assert.ok(dom.container.textContent?.includes("human"));
  });

  it("applies correct class for each kind", () => {
    for (const kind of ["human", "agent", "ghostpaw", "service", "other"]) {
      render(<PackKindBadge kind={kind} />, dom.container);
      const badge = dom.container.querySelector(".badge");
      assert.ok(badge, `badge should exist for kind: ${kind}`);
      render(null, dom.container);
    }
  });
});
