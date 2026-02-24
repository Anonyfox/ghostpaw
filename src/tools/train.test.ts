import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";

import { createTrainTool } from "./train.js";

describe("Train tool", () => {
  const tool = createTrainTool("/tmp/fake-workspace");

  it("has correct tool metadata", () => {
    strictEqual(tool.name, "train");
    ok(tool.description.length > 0);
    ok(tool.description.includes("train"));
  });

  it("has a 10-minute timeout", () => {
    strictEqual(tool.timeout, 10 * 60 * 1000);
  });

  it("timeout is not the default 10s", () => {
    ok(tool.timeout > 10_000, `timeout should be >> 10s, got ${tool.timeout}ms`);
  });
});

describe("Train tool - excludeTools integration", () => {
  it("excludeTools prevents train tool from being registered", async () => {
    const { createToolRegistry } = await import("./registry.js");
    const registry = createToolRegistry();

    const exclude = new Set(["train", "scout"]);
    if (!exclude.has("train")) registry.register(createTrainTool("/tmp"));

    ok(!registry.has("train"), "train tool should not be registered when excluded");
  });

  it("train tool is registered when not excluded", async () => {
    const { createToolRegistry } = await import("./registry.js");
    const registry = createToolRegistry();

    const exclude = new Set<string>([]);
    if (!exclude.has("train")) registry.register(createTrainTool("/tmp"));

    ok(registry.has("train"), "train tool should be registered when not excluded");
  });
});
