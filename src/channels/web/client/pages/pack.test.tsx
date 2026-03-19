import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { PackPage } from "./pack.tsx";

describe("PackPage", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders loading state initially", () => {
    render(<PackPage />, dom.container);
    assert.ok(dom.container.textContent?.includes("Loading pack"));
  });
});
