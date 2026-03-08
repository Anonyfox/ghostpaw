import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { PackPatrolPanel } from "./pack_patrol_panel.tsx";

describe("PackPatrolPanel", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders without crashing when API is unavailable", () => {
    render(<PackPatrolPanel />, dom.container);
    assert.equal(dom.container.textContent, "");
  });
});
