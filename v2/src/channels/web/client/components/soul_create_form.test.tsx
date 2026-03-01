import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { SoulCreateForm } from "./soul_create_form.tsx";

describe("SoulCreateForm", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders collapsed state with create button", () => {
    render(<SoulCreateForm onCreated={() => {}} />, dom.container);
    assert.ok(dom.container.textContent?.includes("Create New Soul"));
    assert.ok(dom.container.querySelector("button.card"), "collapsed card button should exist");
  });
});
