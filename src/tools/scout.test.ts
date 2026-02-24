import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";

import { createScoutTool } from "./scout.js";

describe("Scout tool", () => {
  const tool = createScoutTool("/tmp/fake-workspace");

  it("has correct tool metadata", () => {
    strictEqual(tool.name, "scout");
    ok(tool.description.length > 0);
    ok(tool.description.includes("scout"));
  });

  it("has a 5-minute timeout", () => {
    strictEqual(tool.timeout, 5 * 60 * 1000);
  });

  it("timeout is not the default 10s", () => {
    ok(tool.timeout > 10_000, `timeout should be >> 10s, got ${tool.timeout}ms`);
  });
});
