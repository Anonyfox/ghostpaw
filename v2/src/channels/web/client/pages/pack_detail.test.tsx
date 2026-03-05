import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PackDetailPage } from "./pack_detail.tsx";

describe("PackDetailPage", () => {
  it("exports a function component", () => {
    assert.equal(typeof PackDetailPage, "function");
  });
});
