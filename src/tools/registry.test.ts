import { ok, strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import { createTool, Schema } from "chatoyant";
import { ValidationError } from "../lib/errors.js";
import { createToolRegistry } from "./registry.js";

class TestParams extends Schema {
  input = Schema.String({ description: "Some input" });
}

function dummyTool(name = "test_tool", description = "A test tool") {
  return createTool({
    name,
    description,
    // biome-ignore lint: TS index-signature limitation
    parameters: new TestParams() as any,
    execute: async ({ args }) => {
      const { input } = args as { input: string };
      return { result: input };
    },
  });
}

describe("ToolRegistry - registration", () => {
  it("registers a tool successfully", () => {
    const registry = createToolRegistry();
    registry.register(dummyTool());
    strictEqual(registry.has("test_tool"), true);
  });

  it("throws on duplicate registration", () => {
    const registry = createToolRegistry();
    registry.register(dummyTool());
    throws(
      () => registry.register(dummyTool()),
      (err: unknown) => {
        ok(err instanceof ValidationError);
        ok(err.message.includes("test_tool"));
        return true;
      },
    );
  });
});

describe("ToolRegistry - lookup", () => {
  it("gets a registered tool by name", () => {
    const registry = createToolRegistry();
    registry.register(dummyTool());
    const tool = registry.get("test_tool");
    ok(tool);
    strictEqual(tool.name, "test_tool");
  });

  it("returns undefined for unregistered tool", () => {
    const registry = createToolRegistry();
    strictEqual(registry.get("nonexistent"), undefined);
  });

  it("lists all registered tools", () => {
    const registry = createToolRegistry();
    registry.register(dummyTool("alpha"));
    registry.register(dummyTool("beta"));
    registry.register(dummyTool("gamma"));
    const list = registry.list();
    strictEqual(list.length, 3);
    ok(list.some((t) => t.name === "alpha"));
    ok(list.some((t) => t.name === "beta"));
    ok(list.some((t) => t.name === "gamma"));
  });

  it("has() returns false for unregistered tool", () => {
    const registry = createToolRegistry();
    strictEqual(registry.has("nope"), false);
  });
});

describe("ToolRegistry - unregister", () => {
  it("removes a registered tool", () => {
    const registry = createToolRegistry();
    registry.register(dummyTool());
    registry.unregister("test_tool");
    strictEqual(registry.has("test_tool"), false);
  });

  it("is a no-op for unregistered tool", () => {
    const registry = createToolRegistry();
    registry.unregister("nonexistent");
  });

  it("allows re-registration after unregister", () => {
    const registry = createToolRegistry();
    registry.register(dummyTool());
    strictEqual(registry.has("test_tool"), true);
    registry.unregister("test_tool");
    strictEqual(registry.has("test_tool"), false);
    registry.register(dummyTool());
    strictEqual(registry.has("test_tool"), true);
  });

  it("returns empty list after all tools unregistered", () => {
    const registry = createToolRegistry();
    registry.register(dummyTool("a"));
    registry.register(dummyTool("b"));
    registry.unregister("a");
    registry.unregister("b");
    strictEqual(registry.list().length, 0);
  });
});
