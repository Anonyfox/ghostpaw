import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { DelegateArgs, DelegateHandler } from "./delegate.ts";
import { createDelegateTool } from "./delegate.ts";

function mockHandler(response: string | Record<string, unknown>): DelegateHandler {
  return async () => response;
}

describe("createDelegateTool", () => {
  it("has correct tool name", () => {
    const tool = createDelegateTool(mockHandler("ok"), []);
    strictEqual(tool.name, "delegate");
  });

  it("includes specialist names in description when provided", () => {
    const tool = createDelegateTool(mockHandler("ok"), ["js-engineer", "mentor"]);
    ok(tool.description.includes("js-engineer"));
    ok(tool.description.includes("mentor"));
  });

  it("omits specialist line when none available", () => {
    const tool = createDelegateTool(mockHandler("ok"), []);
    ok(!tool.description.includes("Available specialists"));
  });

  it("calls handler with all args", async () => {
    let received: DelegateArgs | null = null;
    const handler: DelegateHandler = async (args) => {
      received = args;
      return "done";
    };
    const tool = createDelegateTool(handler, []);
    const input = {
      args: {
        task: "write tests",
        specialist: "js-engineer",
        model: "gpt-4o",
        timeout: 600,
        background: true,
      },
    } as Parameters<typeof tool.execute>[0];
    await tool.execute(input);
    ok(received);
    const r = received as DelegateArgs;
    strictEqual(r.task, "write tests");
    strictEqual(r.specialist, "js-engineer");
    strictEqual(r.model, "gpt-4o");
    strictEqual(r.timeout, 600);
    strictEqual(r.background, true);
  });

  it("returns handler string result unchanged", async () => {
    const tool = createDelegateTool(mockHandler("task completed"), []);
    const input = { args: { task: "do it" } } as Parameters<typeof tool.execute>[0];
    const result = await tool.execute(input);
    strictEqual(result, "task completed");
  });

  it("returns handler object result unchanged", async () => {
    const obj = { runId: 42, status: "running" };
    const tool = createDelegateTool(mockHandler(obj), []);
    const input = { args: { task: "bg task" } } as Parameters<typeof tool.execute>[0];
    const result = await tool.execute(input);
    deepStrictEqual(result, obj);
  });

  it("returns error for empty task", async () => {
    const tool = createDelegateTool(mockHandler("ok"), []);
    const input = { args: { task: "   " } } as Parameters<typeof tool.execute>[0];
    const result = (await tool.execute(input)) as { error: string };
    strictEqual(result.error, "Task cannot be empty.");
  });
});
