import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { MemoryCommandBox } from "./memory_command_box.tsx";

describe("MemoryCommandBox", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders input and submit button", () => {
    render(<MemoryCommandBox onSuccess={() => {}} />, dom.container);
    assert.ok(dom.container.querySelector("input"));
    assert.ok(dom.container.querySelector("button"));
  });

  it("disables submit when input is empty", () => {
    render(<MemoryCommandBox onSuccess={() => {}} />, dom.container);
    const button = dom.container.querySelector("button") as HTMLButtonElement;
    assert.ok(button.disabled);
  });

  it("uses general placeholder when no memoryId", () => {
    render(<MemoryCommandBox onSuccess={() => {}} />, dom.container);
    const input = dom.container.querySelector("input") as HTMLInputElement;
    assert.ok(input.placeholder.includes("remember"));
  });

  it("uses targeted placeholder when memoryId is set", () => {
    render(<MemoryCommandBox memoryId={42} onSuccess={() => {}} />, dom.container);
    const input = dom.container.querySelector("input") as HTMLInputElement;
    assert.ok(input.placeholder.includes("outdated"));
  });

  it("uses custom placeholder when provided", () => {
    render(<MemoryCommandBox onSuccess={() => {}} placeholder="custom hint" />, dom.container);
    const input = dom.container.querySelector("input") as HTMLInputElement;
    assert.equal(input.placeholder, "custom hint");
  });
});
