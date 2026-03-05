import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { PackTrustPips } from "./pack_trust_pips.tsx";

describe("PackTrustPips", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders 10 pips", () => {
    render(<PackTrustPips trust={0.5} />, dom.container);
    const pips = dom.container.querySelectorAll(".rounded-circle");
    assert.equal(pips.length, 10);
  });

  it("fills correct number of pips", () => {
    render(<PackTrustPips trust={0.7} />, dom.container);
    const filled = dom.container.querySelectorAll(".bg-info, .bg-warning, .bg-secondary");
    assert.ok(filled.length > 0);
  });

  it("supports md size", () => {
    render(<PackTrustPips trust={0.3} size="md" />, dom.container);
    const pips = dom.container.querySelectorAll(".rounded-circle");
    assert.equal(pips.length, 10);
  });
});
