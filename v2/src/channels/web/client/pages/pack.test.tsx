import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PackPage } from "./pack.tsx";

describe("PackPage", () => {
  it("exports a function component", () => {
    assert.equal(typeof PackPage, "function");
  });
});
