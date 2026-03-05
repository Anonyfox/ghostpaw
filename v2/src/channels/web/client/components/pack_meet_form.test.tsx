import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { PackMeetForm } from "./pack_meet_form.tsx";

describe("PackMeetForm", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders collapsed state with meet button", () => {
    render(<PackMeetForm onCreated={() => {}} />, dom.container);
    assert.ok(dom.container.textContent?.includes("Meet Someone New"));
    assert.ok(dom.container.querySelector("button.card"), "collapsed card button should exist");
  });
});
