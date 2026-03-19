import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { PackCommandBox } from "./pack_command_box.tsx";

describe("PackCommandBox", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders input and submit button", () => {
    render(<PackCommandBox onSuccess={() => {}} />, dom.container);
    assert.ok(dom.container.querySelector("input"));
    assert.ok(dom.container.querySelector("button"));
  });

  it("disables submit when input is empty", () => {
    render(<PackCommandBox onSuccess={() => {}} />, dom.container);
    const button = dom.container.querySelector("button") as HTMLButtonElement;
    assert.ok(button.disabled);
  });

  it("uses custom placeholder when provided", () => {
    render(<PackCommandBox onSuccess={() => {}} placeholder="test placeholder" />, dom.container);
    const input = dom.container.querySelector("input") as HTMLInputElement;
    assert.equal(input.placeholder, "test placeholder");
  });
});
